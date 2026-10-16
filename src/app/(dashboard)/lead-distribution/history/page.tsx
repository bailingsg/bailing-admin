import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  listAssignments,
  listEligibleAssignees,
  SOURCE_LABELS,
  type LeadAssignmentSource,
  type LeadDistributionState,
} from '@/lib/lead-distribution';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '分配历史',
  description: '询盘自动分配的全量记录：承接人、来源（正常轮询 / 倾斜计划）与时间。',
};

const PAGE_SIZE = 20;

function isSource(value: string | undefined): value is LeadAssignmentSource {
  return value === 'ROUND_ROBIN' || value === 'PRIORITY_PLAN';
}

/**
 * 询盘分配历史（Phase 4.6）。
 *
 * 数据来自后端 GET /api/v1/cms/lead-distribution/assignments（分页 + 筛选），
 * 每条记录都是真实落库的 LeadAssignment。
 */
export default async function LeadDistributionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; source?: string; assigneeId?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const source = isSource(params.source) ? params.source : undefined;
  const assigneeId = params.assigneeId?.trim() || undefined;

  const token = await getSessionToken();
  const [result, assigneesResult] = await Promise.all([
    listAssignments(token, { page, limit: PAGE_SIZE, source, assigneeId }),
    listEligibleAssignees(token),
  ]);

  const buildHref = (next: { page?: number; source?: LeadAssignmentSource; assigneeId?: string }) => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    const finalSource = next.source === undefined ? source : next.source;
    if (finalSource) search.set('source', finalSource);
    const finalAssignee = next.assigneeId === undefined ? assigneeId : next.assigneeId;
    if (finalAssignee) search.set('assigneeId', finalAssignee);
    const query = search.toString();
    return query ? `/lead-distribution/history?${query}` : '/lead-distribution/history';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="分配历史"
        description="询盘自动分配的全量记录。每条记录对应一次真实分配，含承接人、来源与轮询序号。"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/lead-distribution">返回分配总览</Link>
          </Button>
        }
      />

      {/* 筛选 */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/lead-distribution/history" method="get">
        <div className="flex w-56 flex-col gap-1.5">
          <label htmlFor="source" className="text-small font-medium text-foreground">
            分配来源
          </label>
          <select
            id="source"
            name="source"
            defaultValue={source ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部来源</option>
            <option value="ROUND_ROBIN">{SOURCE_LABELS.ROUND_ROBIN}</option>
            <option value="PRIORITY_PLAN">{SOURCE_LABELS.PRIORITY_PLAN}</option>
          </select>
        </div>
        <div className="flex w-64 flex-col gap-1.5">
          <label htmlFor="assigneeId" className="text-small font-medium text-foreground">
            承接人
          </label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={assigneeId ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部员工</option>
            {(assigneesResult.ok ? assigneesResult.data : []).map((employee) => (
              <option key={employee.adminUserId} value={employee.adminUserId}>
                {employee.name ?? employee.email}
                {employee.isActive ? '' : '（已停用）'}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          筛选
        </Button>
        {(source || assigneeId) && (
          <Button asChild variant="ghost">
            <Link href="/lead-distribution/history">重置</Link>
          </Button>
        )}
      </form>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载分配历史</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无分配记录</p>
            <p className="mt-1 text-small text-text-secondary">
              {source || assigneeId
                ? '当前筛选条件下没有记录，试试调整条件。'
                : '当客户通过官网提交询价后，会自动分配给队列中的员工并记录在这里。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条记录
            {source ? `（${SOURCE_LABELS[source]}）` : ''}
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 font-medium">询盘</th>
                  <th className="px-4 py-3 font-medium">承接人</th>
                  <th className="px-4 py-3 font-medium">来源</th>
                  <th className="px-4 py-3 font-medium">轮询序号</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-small text-text-secondary">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/rfq/${item.rfqId}`}
                        className="text-small font-medium text-primary hover:underline"
                      >
                        {item.rfqSummary.name}
                      </Link>
                      <div className="text-caption text-text-muted">
                        {item.rfqSummary.company} · {item.rfqSummary.country}
                        {item.rfqSummary.productName ? ` · ${item.rfqSummary.productName}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {item.assignee.name ?? item.assignee.email}
                      <div className="text-caption text-text-muted">{item.assignee.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.source === 'PRIORITY_PLAN' ? 'warning' : 'outline'}>
                        {SOURCE_LABELS[item.source]}
                        {item.planName ? ` · ${item.planName}` : ''}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {item.roundRobinIndex === null ? '—' : item.roundRobinIndex + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 md:hidden">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-small font-medium text-foreground">
                        {item.rfqSummary.name}
                      </span>
                      <Badge variant={item.source === 'PRIORITY_PLAN' ? 'warning' : 'outline'}>
                        {SOURCE_LABELS[item.source]}
                      </Badge>
                    </div>
                    <span className="text-caption text-text-muted">
                      {item.rfqSummary.company} · {item.rfqSummary.country}
                    </span>
                    <span className="text-small text-text-secondary">
                      承接人：{item.assignee.name ?? item.assignee.email}
                    </span>
                    <span className="text-caption text-text-muted">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {result.data.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-small text-text-secondary">
                第 {result.data.page} / {result.data.totalPages} 页
              </span>
              <div className="flex gap-2">
                {result.data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref({ page: result.data.page - 1 })}>上一页</Link>
                  </Button>
                ) : null}
                {result.data.page < result.data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref({ page: result.data.page + 1 })}>下一页</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}

/** 供筛选下拉复用的类型导出 */
export type { LeadDistributionState };
