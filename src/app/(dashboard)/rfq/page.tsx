import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import {
  getRfqList,
  RFQ_STATUS_LABELS,
  RFQ_STATUSES,
  type RfqListItem,
  type RfqStatus,
} from '@/lib/rfq';
import { getSessionToken } from '@/lib/session';
import { RfqNotifyBadge } from './notify-badge';
import { QuickResendButton } from './quick-resend-button';
import { RfqStatusBadge } from './status-badge';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'RFQ 询盘管理',
  description: '查看与跟进海外采购商提交的询价（RFQ）。',
};

const PAGE_SIZE = 20;

function isStatus(value: string | undefined): value is RfqStatus {
  return value !== undefined && (RFQ_STATUSES as string[]).includes(value);
}

/**
 * RFQ 询盘列表。
 *
 * 数据来自后端 GET /api/v1/rfq（JWT + rfq.read 权限）。
 * 移动端渲染为卡片列表，桌面端渲染为表格 —— 均不产生横向滚动。
 */
export default async function RfqListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const status = isStatus(params.status) ? params.status : undefined;

  const token = await getSessionToken();

  const result = await getRfqList(token, { page, pageSize: PAGE_SIZE, status });

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="RFQ 询盘管理"
        description="海外采购商通过官网提交的询价请求。点击客户姓名或右侧「查看详情」，可查看完整需求、跟进状态与通知补发。"
      />

      {/* 状态筛选 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <FilterChip label="全部" href="/rfq" active={!status} />
        {RFQ_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={RFQ_STATUS_LABELS[s]}
            href={`/rfq?status=${s}`}
            active={status === s}
          />
        ))}
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载询盘列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无询盘</p>
            <p className="mt-1 text-small text-text-secondary">
              {status ? '该状态下还没有记录。' : '当客户通过官网提交询价后，会显示在这里。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条
            {status ? `（${RFQ_STATUS_LABELS[status]}）` : ''}
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <Th>Name</Th>
                  <Th>Company</Th>
                  <Th>Country</Th>
                  <Th>Product</Th>
                  <Th>Status</Th>
                  <Th>分配至</Th>
                  <Th>通知</Th>
                  <Th>Created</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <Td>
                      <Link href={`/rfq/${item.id}`} className="font-medium text-primary hover:underline">
                        {item.name}
                      </Link>
                    </Td>
                    <Td>{item.company}</Td>
                    <Td>{item.country}</Td>
                    <Td>{item.productName ?? '—'}</Td>
                    <Td>
                      <RfqStatusBadge status={item.status} />
                    </Td>
                    <Td>
                      {item.assigneeName ? (
                        <span className="text-text-secondary" title={item.assigneeEmail ?? undefined}>
                          {item.assigneeName}
                        </span>
                      ) : (
                        <span className="text-text-muted">未分配</span>
                      )}
                    </Td>
                    <Td>
                      <Link
                        href={`/rfq/${item.id}`}
                        className="inline-flex"
                        title="查看详情 / 补发通知"
                      >
                        <RfqNotifyBadge status={item.notifyStatus} />
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTime(item.createdAt)}</Td>
                    <Td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/rfq/${item.id}`}>查看详情</Link>
                        </Button>
                        {item.notifyStatus !== 'SENT' ? <QuickResendButton id={item.id} /> : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表（避免表格横向滚动） */}
          <ul className="mt-3 flex flex-col gap-3 md:hidden">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/rfq/${item.id}`} className="block">
                  <Card>
                    <CardContent className="flex flex-col gap-2 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <RfqStatusBadge status={item.status} />
                      </div>
                      <span className="text-small text-text-secondary">{item.company}</span>
                      <span className="text-caption text-text-muted">
                        {item.country}
                        {item.productName ? ` · ${item.productName}` : ''}
                      </span>
                      <span className="text-caption text-text-muted">
                        分配至：
                        {item.assigneeName ?? '未分配'}
                      </span>
                      <span className="flex items-center gap-2 text-caption text-text-muted">
                        通知：<RfqNotifyBadge status={item.notifyStatus} />
                      </span>
                      <span className="flex items-center justify-between gap-2 text-caption text-text-muted">
                        <span>{formatDateTime(item.createdAt)}</span>
                        <span className="font-medium text-primary">查看详情 →</span>
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination page={result.data.page} totalPages={result.data.totalPages} status={status} />
        </>
      )}
    </Container>
  );
}

/* ------------------------------ 局部组件 ------------------------------ */

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href}>
      <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer">
        {label}
      </Badge>
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-small text-text-secondary ${className ?? ''}`}>{children}</td>;
}

function Pagination({
  page,
  totalPages,
  status,
}: {
  page: number;
  totalPages: number;
  status?: RfqStatus;
}) {
  if (totalPages <= 1) return null;
  const suffix = status ? `&status=${status}` : '';
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <span className="text-small text-text-secondary">
        第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/rfq?page=${page - 1}${suffix}`}>上一页</Link>
          </Button>
        ) : null}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/rfq?page=${page + 1}${suffix}`}>下一页</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** 供列表行复用的类型（保持导出，便于后续扩展） */
export type { RfqListItem };
