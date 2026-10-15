import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  QUALITY_RECORD_TYPES,
  QUALITY_RECORD_TYPE_LABELS,
  expiryHint,
  listQualityRecords,
  type ContentStatus,
  type QualityRecordType,
} from '@/lib/enterprise';
import { DeleteQualityButton } from './delete-quality-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '质量体系',
  description: '管理认证证书、检测报告、质量控制与执行标准。',
};

const PAGE_SIZE = 20;

function isStatus(value: string | undefined): value is ContentStatus {
  return value !== undefined && (CONTENT_STATUSES as string[]).includes(value);
}

function isRecordType(value: string | undefined): value is QualityRecordType {
  return value !== undefined && (QUALITY_RECORD_TYPES as string[]).includes(value);
}

/**
 * 质量体系列表（Phase 4.5）。
 *
 * 列：标题 / 记录类型 / 认证机构 / 证书编号 / 有效期 / 发布状态 / 操作。
 * 到期提示克制：仅在存在真实到期日时给出「已到期 / N 天后到期」，缺失不提示。
 */
export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; recordType?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const recordType = isRecordType(params.recordType) ? params.recordType : undefined;
  const status = isStatus(params.status) ? params.status : undefined;

  const token = await getSessionToken();
  const result = await listQualityRecords(token, {
    page,
    limit: PAGE_SIZE,
    keyword,
    recordType,
    status,
  });

  const withFilters = (next: { page?: number; status?: ContentStatus; recordType?: QualityRecordType }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    if (keyword) search.set('keyword', keyword);
    const finalStatus = next.status === undefined ? status : next.status;
    if (finalStatus) search.set('status', finalStatus);
    const finalType = next.recordType === undefined ? recordType : next.recordType;
    if (finalType) search.set('recordType', finalType);
    const query = search.toString();
    return query ? `/quality?${query}` : '/quality';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="质量体系"
        description="管理认证证书、检测报告、质量控制流程与执行标准；支持 PDF 证书上传与关联。"
        actions={
          <Button asChild size="sm">
            <Link href="/quality/create">新建记录</Link>
          </Button>
        }
      />

      {/* 搜索 + 类型筛选 */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/quality" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="标题 / slug / 机构 / 证书编号"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="recordType" className="text-small font-medium text-foreground">
            记录类型
          </label>
          <select
            id="recordType"
            name="recordType"
            defaultValue={recordType ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部类型</option>
            {QUALITY_RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUALITY_RECORD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Button type="submit" variant="outline" size="default">
          筛选
        </Button>
      </form>

      {/* 状态筛选 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={withFilters({ page: 1, status: undefined })}>
          <Badge variant={!status ? 'default' : 'outline'} className="cursor-pointer">
            全部
          </Badge>
        </Link>
        {CONTENT_STATUSES.map((s) => (
          <Link key={s} href={withFilters({ page: 1, status: s })}>
            <Badge variant={status === s ? 'default' : 'outline'} className="cursor-pointer">
              {CONTENT_STATUS_LABELS[s]}
            </Badge>
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载质量记录列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无质量记录</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || status || recordType
                ? '当前筛选条件下没有记录，试试调整条件。'
                : '点击右上角「新建记录」添加认证、报告或标准。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条记录
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">记录类型</th>
                  <th className="px-4 py-3 font-medium">认证机构</th>
                  <th className="px-4 py-3 font-medium">证书编号</th>
                  <th className="px-4 py-3 font-medium">有效期</th>
                  <th className="px-4 py-3 font-medium">发布状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => {
                  const expiry = expiryHint(item.expiryDate);
                  return (
                    <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/quality/${item.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                        <div className="text-caption text-text-muted">{item.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {QUALITY_RECORD_TYPE_LABELS[item.recordType]}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {item.issuer ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {item.certificateNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                        {item.expiryDate ? (
                          <span className="flex flex-col">
                            <span>{formatDate(item.expiryDate)}</span>
                            {expiry ? (
                              <span className="text-caption text-warning-600">{expiry.text}</span>
                            ) : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === 'PUBLISHED' ? 'success' : 'warning'}>
                          {CONTENT_STATUS_LABELS[item.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/quality/${item.id}/edit`}>编辑</Link>
                          </Button>
                          <DeleteQualityButton id={item.id} title={item.title} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item) => {
              const expiry = expiryHint(item.expiryDate);
              return (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-2 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/quality/${item.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                        <Badge variant={item.status === 'PUBLISHED' ? 'success' : 'warning'}>
                          {CONTENT_STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                      <span className="text-small text-text-secondary">
                        {QUALITY_RECORD_TYPE_LABELS[item.recordType]}
                        {item.issuer ? ` · ${item.issuer}` : ''}
                      </span>
                      {item.certificateNumber ? (
                        <span className="text-caption text-text-muted">编号 {item.certificateNumber}</span>
                      ) : null}
                      {item.expiryDate ? (
                        <span className="text-caption text-text-muted">
                          有效期至 {formatDate(item.expiryDate)}
                          {expiry ? ` · ${expiry.text}` : ''}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-2 pt-1">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/quality/${item.id}/edit`}>编辑</Link>
                        </Button>
                        <DeleteQualityButton id={item.id} title={item.title} />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>

          {result.data.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-small text-text-secondary">
                第 {result.data.page} / {result.data.totalPages} 页
              </span>
              <div className="flex gap-2">
                {result.data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: result.data.page - 1 })}>上一页</Link>
                  </Button>
                ) : null}
                {result.data.page < result.data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: result.data.page + 1 })}>下一页</Link>
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
