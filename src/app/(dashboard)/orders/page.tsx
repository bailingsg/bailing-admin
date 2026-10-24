import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getCurrentAdmin } from '@/lib/api';
import { listAccounts } from '@/lib/rbac';
import {
  formatOrderAmount,
  listOrders,
  type OrderItem,
} from '@/lib/orders';
import { OrderForm } from './order-form';
import { withBasePath } from '@/lib/base-path';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '订单管理',
  description: '业务员订单录入、客户需求、成交状态与订单照片管理。',
};

const PAGE_SIZE = 20;

/** 是否已成交（closedAt 非空） */
function isClosed(order: OrderItem): boolean {
  return Boolean(order.closedAt);
}

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    keyword?: string;
    code?: string;
    country?: string;
    closedState?: string;
    salespersonId?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const code = params.code?.trim() || undefined;
  const country = params.country?.trim() || undefined;
  const closedState =
    params.closedState === 'closed' || params.closedState === 'open' ? params.closedState : undefined;
  const salespersonId = params.salespersonId?.trim() || undefined;

  const token = await getSessionToken();
  const [me, result, salesResult] = await Promise.all([
    getCurrentAdmin(token),
    listOrders(token, { page, limit: PAGE_SIZE, keyword, code, country, closedState, salespersonId }),
    // 管理员可按业务员筛选：候选来自账号列表中的 SALES 角色账号
    listAccounts(token, { isActive: true, limit: 100 }),
  ]);
  const isAdmin = me.ok && me.data.isSuperAdmin;

  const salespersonOptions = new Map<string, string>();
  if (isAdmin && salesResult.ok) {
    for (const account of salesResult.data.items) {
      if (account.roles.some((role) => role.key === 'SALES')) {
        salespersonOptions.set(account.id, account.name?.trim() || account.email);
      }
    }
  }

  const totalPages = result.ok ? Math.max(1, result.data.totalPages) : 1;

  // 分页链接保留筛选条件
  const filterQuery = [
    keyword ? `keyword=${encodeURIComponent(keyword)}` : '',
    code ? `code=${encodeURIComponent(code)}` : '',
    country ? `country=${encodeURIComponent(country)}` : '',
    closedState ? `closedState=${closedState}` : '',
    salespersonId ? `salespersonId=${encodeURIComponent(salespersonId)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  const hrefFor = (target: number) => `/orders?page=${target}${filterQuery ? `&${filterQuery}` : ''}`;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="订单管理"
        description={
          isAdmin
            ? '管理员可查看全部业务员的订单；订单照片为业务附件，与媒体库完全隔离。'
            : '仅展示你本人录入的订单；订单照片为业务附件，与媒体库完全隔离。'
        }
        actions={<OrderForm mode="create" />}
      />

      {/* 筛选区 */}
      <form
        action={withBasePath('/orders')}
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
            placeholder="订单编号 / 客户名称 / 需求"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex min-w-44 flex-col gap-1.5">
          <label htmlFor="code" className="text-small font-medium text-foreground">
            订单编号
          </label>
          <input
            id="code"
            name="code"
            type="search"
            defaultValue={code ?? ''}
            placeholder="按订单编号精确查询"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className="text-small font-medium text-foreground">
            国家/地区
          </label>
          <input
            id="country"
            name="country"
            type="search"
            defaultValue={country ?? ''}
            placeholder="如 United States"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="closedState" className="text-small font-medium text-foreground">
            成交状态
          </label>
          <select
            id="closedState"
            name="closedState"
            defaultValue={closedState ?? ''}
            className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
          >
            <option value="">全部状态</option>
            <option value="closed">已成交</option>
            <option value="open">未成交</option>
          </select>
        </div>
        {isAdmin && salespersonOptions.size > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="salespersonId" className="text-small font-medium text-foreground">
              业务员
            </label>
            <select
              id="salespersonId"
              name="salespersonId"
              defaultValue={salespersonId ?? ''}
              className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
            >
              <option value="">全部业务员</option>
              {[...salespersonOptions.entries()].map(([id, name]) => (
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
            href="/orders"
            className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small text-foreground hover:bg-accent"
          >
            重置
          </Link>
        </div>
      </form>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="py-8">
            <p className="text-body font-medium text-foreground">无法加载订单列表</p>
            <p className="mt-1 text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无订单</p>
            <p className="mt-1 text-small text-text-secondary">
              点击右上角「新增订单」录入第一笔订单。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">订单编号</th>
                  <th className="px-4 py-3 font-medium">客户 / 国家</th>
                  <th className="px-4 py-3 font-medium">金额</th>
                  <th className="px-4 py-3 font-medium">下单时间</th>
                  <th className="px-4 py-3 font-medium">成交状态</th>
                  {isAdmin ? <th className="px-4 py-3 font-medium">业务员</th> : null}
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{item.customerName}</span>
                      <span className="ml-2 text-caption text-text-muted">{item.country}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {formatOrderAmount(item.amount, item.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                      {formatDateTime(item.orderedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {isClosed(item) ? (
                        <Badge variant="success">已成交</Badge>
                      ) : (
                        <Badge variant="muted">未成交</Badge>
                      )}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3 text-foreground">{item.salespersonName ?? '—'}</td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${item.id}`}
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
            {result.data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/orders/${item.id}`} className="block">
                  <Card>
                    <CardContent className="flex flex-col gap-2 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-primary">{item.code}</span>
                        {isClosed(item) ? (
                          <Badge variant="success">已成交</Badge>
                        ) : (
                          <Badge variant="muted">未成交</Badge>
                        )}
                      </div>
                      <p className="text-body font-medium text-foreground">
                        {item.customerName}
                        <span className="ml-2 text-caption text-text-muted">{item.country}</span>
                      </p>
                      <p className="text-small font-medium text-foreground">
                        {formatOrderAmount(item.amount, item.currency)}
                      </p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
                        <div>
                          <dt className="text-text-muted">下单时间</dt>
                          <dd className="text-foreground">{formatDateTime(item.orderedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">成交时间</dt>
                          <dd className="text-foreground">
                            {item.closedAt ? formatDateTime(item.closedAt) : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">照片</dt>
                          <dd className="text-foreground">{item.attachments.length} 张</dd>
                        </div>
                        {isAdmin ? (
                          <div>
                            <dt className="text-text-muted">业务员</dt>
                            <dd className="text-foreground">{item.salespersonName ?? '—'}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 分页 */}
      {result.ok && result.data.total > PAGE_SIZE ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="分页">
          <Link
            href={hrefFor(page - 1)}
            aria-disabled={page <= 1}
            className={`inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-small ${
              page <= 1 ? 'pointer-events-none text-text-muted' : 'text-foreground hover:bg-accent'
            }`}
          >
            上一页
          </Link>
          <span className="text-small text-text-secondary">
            第 {page} / {totalPages} 页
          </span>
          <Link
            href={hrefFor(page + 1)}
            aria-disabled={page >= totalPages}
            className={`inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-small ${
              page >= totalPages
                ? 'pointer-events-none text-text-muted'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            下一页
          </Link>
        </nav>
      ) : null}
    </Container>
  );
}
