import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getCurrentAdmin } from '@/lib/api';
import { formatQuantity, listInventory } from '@/lib/inventory';
import { InventoryForm } from './inventory-form';
import { InventoryRowActions } from './inventory-row-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '库存管理',
  description: '单仓库库存记录、存放位置、关联订单与数量管理。',
};

const PAGE_SIZE = 20;

export default async function InventoryListPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    code?: string;
    keyword?: string;
    location?: string;
    orderCode?: string;
    storedFrom?: string;
    storedTo?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const code = params.code?.trim() || undefined;
  const keyword = params.keyword?.trim() || undefined;
  const location = params.location?.trim() || undefined;
  const orderCode = params.orderCode?.trim() || undefined;
  const storedFrom = params.storedFrom?.trim() || undefined;
  const storedTo = params.storedTo?.trim() || undefined;

  const token = await getSessionToken();
  const [me, result] = await Promise.all([
    getCurrentAdmin(token),
    listInventory(token, { page, limit: PAGE_SIZE, code, keyword, location, orderCode, storedFrom, storedTo }),
  ]);
  const isAdmin = me.ok && me.data.isSuperAdmin;
  const hasFilter = Boolean(code || keyword || location || orderCode || storedFrom || storedTo);

  const querySuffix = [
    code ? `code=${encodeURIComponent(code)}` : '',
    keyword ? `keyword=${encodeURIComponent(keyword)}` : '',
    location ? `location=${encodeURIComponent(location)}` : '',
    orderCode ? `orderCode=${encodeURIComponent(orderCode)}` : '',
    storedFrom ? `storedFrom=${encodeURIComponent(storedFrom)}` : '',
    storedTo ? `storedTo=${encodeURIComponent(storedTo)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  const hrefFor = (target: number) => `/inventory?page=${target}${querySuffix ? `&${querySuffix}` : ''}`;

  const totalPages = result.ok ? Math.max(1, result.data.totalPages) : 1;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="库存管理"
        description={
          isAdmin
            ? '管理员可查看全部库存记录；业务员仅展示自己创建的记录。'
            : '仅展示你本人创建的库存记录；库存编号由系统生成。'
        }
        actions={<InventoryForm mode="create" />}
      />

      {/* 筛选区 */}
      <form
        action="/inventory"
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      >
        <div className="flex min-w-44 flex-col gap-1.5">
          <label htmlFor="inv-code" className="text-small font-medium text-foreground">
            库存编号
          </label>
          <input
            id="inv-code"
            name="code"
            type="search"
            defaultValue={code ?? ''}
            placeholder="如 INV-20261018-A1B2C3"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex min-w-52 flex-col gap-1.5">
          <label htmlFor="inv-keyword" className="text-small font-medium text-foreground">
            关键词
          </label>
          <input
            id="inv-keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="产品名称 / 产品详情"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex min-w-40 flex-col gap-1.5">
          <label htmlFor="inv-location" className="text-small font-medium text-foreground">
            存放位置
          </label>
          <input
            id="inv-location"
            name="location"
            type="search"
            defaultValue={location ?? ''}
            placeholder="如 A区-3号货架"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex min-w-40 flex-col gap-1.5">
          <label htmlFor="inv-order-code" className="text-small font-medium text-foreground">
            关联订单号
          </label>
          <input
            id="inv-order-code"
            name="orderCode"
            type="search"
            defaultValue={orderCode ?? ''}
            placeholder="按关联订单号精确查询"
            className="h-9 w-full rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inv-from" className="text-small font-medium text-foreground">
            存放日期起
          </label>
          <input
            id="inv-from"
            name="storedFrom"
            type="date"
            defaultValue={storedFrom ?? ''}
            className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inv-to" className="text-small font-medium text-foreground">
            存放日期止
          </label>
          <input
            id="inv-to"
            name="storedTo"
            type="date"
            defaultValue={storedTo ?? ''}
            className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-small font-medium text-primary-foreground hover:bg-primary-hover"
          >
            筛选
          </button>
          <Link
            href="/inventory"
            className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small text-foreground hover:bg-accent"
          >
            重置
          </Link>
        </div>
      </form>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="py-8">
            <p className="text-body font-medium text-foreground">无法加载库存列表</p>
            <p className="mt-1 text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">
              {hasFilter ? '没有符合筛选条件的库存记录' : '暂无库存记录'}
            </p>
            <p className="mt-1 text-small text-text-secondary">
              {hasFilter ? '调整筛选条件后重试。' : '点击右上角「新增库存」录入第一条记录。'}
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
                  <th className="px-4 py-3 font-medium">库存编号</th>
                  <th className="px-4 py-3 font-medium">产品名称</th>
                  <th className="px-4 py-3 font-medium">数量</th>
                  <th className="px-4 py-3 font-medium">存放位置</th>
                  <th className="px-4 py-3 font-medium">存放日期</th>
                  <th className="px-4 py-3 font-medium">关联订单</th>
                  {isAdmin ? <th className="px-4 py-3 font-medium">创建人</th> : null}
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground">{item.productName}</span>
                      <span className="ml-2 text-caption text-text-muted" title={item.productDetail}>
                        {item.productDetail.length > 24
                          ? `${item.productDetail.slice(0, 24)}…`
                          : item.productDetail}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {formatQuantity(item.quantity, item.unit)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{item.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                      {formatDate(item.storedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {item.orderCode && item.orderId ? (
                        <Link
                          href={`/orders/${item.orderId}`}
                          className="text-small text-primary hover:underline"
                        >
                          {item.orderCode}
                        </Link>
                      ) : (
                        <span className="text-caption text-text-muted">未关联</span>
                      )}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3 text-text-secondary">{item.creatorName ?? '—'}</td>
                    ) : null}
                    <td className="px-4 py-3">
                      <InventoryRowActions item={item} />
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
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.code}
                      </Link>
                      <Badge variant="muted">{formatQuantity(item.quantity, item.unit)}</Badge>
                    </div>
                    <p className="text-body font-medium text-foreground">{item.productName}</p>
                    <p className="line-clamp-2 text-small text-text-secondary">{item.productDetail}</p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
                      <div>
                        <dt className="text-text-muted">存放位置</dt>
                        <dd className="text-foreground">{item.location}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">存放日期</dt>
                        <dd className="text-foreground">{formatDate(item.storedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">关联订单</dt>
                        <dd className="text-foreground">{item.orderCode ?? '未关联'}</dd>
                      </div>
                      {isAdmin ? (
                        <div>
                          <dt className="text-text-muted">创建人</dt>
                          <dd className="text-foreground">{item.creatorName ?? '—'}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <div className="mt-1 flex items-center justify-end border-t border-border pt-2">
                      <InventoryRowActions item={item} />
                    </div>
                  </CardContent>
                </Card>
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
