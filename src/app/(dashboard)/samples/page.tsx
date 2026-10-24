import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  SAMPLE_STATUSES,
  SAMPLE_STATUS_LABELS,
  getSampleProfile,
  isAdminProfile,
  listSamples,
  type SampleItem,
  type SampleStatus,
} from '@/lib/samples';
import { withBasePath } from '@/lib/base-path';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '样品管理',
  description: '样品录入、存放位置、持有人与出库申请管理。',
};

const PAGE_SIZE = 20;

function isStatus(value: string | undefined): value is SampleStatus {
  return value !== undefined && (SAMPLE_STATUSES as string[]).includes(value);
}

/** 状态徽标（业务三态 + 归档态） */
function StatusBadge({ status }: { status: SampleStatus }) {
  const tone =
    status === 'IN_STOCK'
      ? 'success'
      : status === 'REQUEST_OUT'
        ? 'warning'
        : status === 'REJECTED'
          ? 'destructive'
          : 'muted';
  return <Badge variant={tone}>{SAMPLE_STATUS_LABELS[status]}</Badge>;
}

/**
 * 样品列表（Phase 5.1）。
 *
 * 数据来自后端 GET /cms/samples。业务员只能看到自己持有或已获授权查看的样品；
 * 管理员可查看全部并可按持有人筛选。桌面端表格、移动端卡片。
 */
export default async function SamplesListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; keyword?: string; ownerId?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const status = isStatus(params.status) ? params.status : undefined;
  const keyword = params.keyword?.trim() || undefined;
  const ownerId = params.ownerId?.trim() || undefined;

  const token = await getSessionToken();
  const me = await getSampleProfile(token);
  const isAdmin = isAdminProfile(me.ok ? me.data : null);

  const [result, owners] = await Promise.all([
    listSamples(token, { page, limit: PAGE_SIZE, keyword, status, ownerId }),
    isAdmin ? listSamples(token, { limit: 100 }) : Promise.resolve(null),
  ]);

  // 持有人筛选候选：从管理员可见全量样品聚合并去重
  const ownerOptions = new Map<string, string>();
  if (owners?.ok) {
    for (const item of owners.data.items) {
      if (!ownerOptions.has(item.ownerId)) ownerOptions.set(item.ownerId, item.ownerName ?? item.ownerId);
    }
  }

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="样品管理"
        description="录入样品、管理存放位置与持有人；可授权业务员查看，或处理出库申请。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/samples/requests"
              className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small font-medium text-foreground transition-colors hover:bg-accent"
            >
              出库申请
              {isAdmin ? '（全部）' : ''}
            </Link>
            {isAdmin ? (
              <Link
                href="/samples/archive"
                className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small font-medium text-foreground transition-colors hover:bg-accent"
              >
                出库归档
              </Link>
            ) : null}
            <Link
              href="/samples/new"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-small font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
            >
              新增样品
            </Link>
          </div>
        }
      />

      {/* 筛选区 */}
      <form
        action={withBasePath('/samples')}
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      >
        <div className="flex min-w-48 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            关键词
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="样品编号 / 名称 / 规格"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-small font-medium text-foreground">
            状态
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
          >
            <option value="">全部状态</option>
            {SAMPLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SAMPLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && ownerOptions.size > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ownerId" className="text-small font-medium text-foreground">
              持有人
            </label>
            <select
              id="ownerId"
              name="ownerId"
              defaultValue={ownerId ?? ''}
              className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
            >
              <option value="">全部持有人</option>
              {[...ownerOptions.entries()].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex items-center gap-2 pb-0.5">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-small font-medium text-primary-foreground hover:bg-primary-hover"
          >
            筛选
          </button>
          <Link
            href="/samples"
            className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small text-foreground hover:bg-accent"
          >
            重置
          </Link>
        </div>
      </form>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="py-8">
            <p className="text-body font-medium text-foreground">无法加载样品列表</p>
            <p className="mt-1 text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无样品</p>
            <p className="mt-1 text-small text-text-secondary">
              点击右上角「新增样品」录入第一件样品。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条
            {status ? `（${SAMPLE_STATUS_LABELS[status]}）` : ''}
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">样品编号</th>
                  <th className="px-4 py-3 font-medium">名称 / 规格</th>
                  <th className="px-4 py-3 font-medium">数量</th>
                  <th className="px-4 py-3 font-medium">存放位置</th>
                  <th className="px-4 py-3 font-medium">持有人</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item: SampleItem) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/samples/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{item.name}</span>
                      {item.spec ? (
                        <span className="ml-2 text-caption text-text-muted">{item.spec}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-foreground">{item.location}</td>
                    <td className="px-4 py-3 text-foreground">{item.ownerName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/samples/${item.id}`}
                        className="text-small text-primary hover:underline"
                      >
                        详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端 / 平板：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item: SampleItem) => (
              <li key={item.id}>
                <Link href={`/samples/${item.id}`} className="block">
                  <Card>
                    <CardContent className="flex flex-col gap-2 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-primary">{item.code}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-body font-medium text-foreground">{item.name}</p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
                        <div>
                          <dt className="text-text-muted">规格</dt>
                          <dd className="text-foreground">{item.spec ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">数量</dt>
                          <dd className="text-foreground">
                            {item.quantity} {item.unit}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-text-muted">存放位置</dt>
                          <dd className="text-foreground">{item.location}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">持有人</dt>
                          <dd className="text-foreground">{item.ownerName ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">创建时间</dt>
                          <dd className="text-foreground">{formatDateTime(item.createdAt)}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
