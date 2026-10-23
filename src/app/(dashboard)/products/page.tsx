import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { friendlyQueryError } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import {
  listCategories,
  listProducts,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  type ProductStatus,
} from '@/lib/products';
import { DeleteProductButton } from './delete-product-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '产品管理',
  description: '管理官网产品：创建、编辑、上下架与图片。',
};

const PAGE_SIZE = 20;

function isStatus(value: string | undefined): value is ProductStatus {
  return value !== undefined && (PRODUCT_STATUSES as string[]).includes(value);
}

function statusBadgeVariant(status: ProductStatus): 'success' | 'warning' | 'muted' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'DRAFT') return 'warning';
  return 'muted';
}

/**
 * 产品列表（Phase 4.2）。
 *
 * 数据来自后端 GET /api/v1/cms/products（JWT 保护）。
 * 筛选（keyword / categoryId / status）与分页均由 URL 查询参数驱动，
 * 服务端渲染，无客户端数据请求。
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; status?: string; categoryId?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const status = isStatus(params.status) ? params.status : undefined;
  const categoryId = params.categoryId?.trim() || undefined;

  const token = await getSessionToken();
  const [productsResult, categoriesResult] = await Promise.all([
    listProducts(token, { page, limit: PAGE_SIZE, keyword, status, categoryId }),
    listCategories(token),
  ]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];

  /** 保留当前筛选条件拼接分页链接 */
  const withFilters = (next: { page?: number; status?: ProductStatus }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    if (next.status ?? status) search.set('status', (next.status ?? status) as string);
    if (keyword) search.set('keyword', keyword);
    if (categoryId) search.set('categoryId', categoryId);
    const query = search.toString();
    return query ? `/products?${query}` : '/products';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="产品管理"
        description="管理官网展示的产品内容，支持草稿、发布与图片管理。"
        actions={
          <Button asChild size="sm">
            <Link href="/products/create">新建产品</Link>
          </Button>
        }
      />

      {/* 搜索 + 分类筛选（GET 表单，服务端渲染） */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/products" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            maxLength={120}
            defaultValue={keyword ?? ''}
            placeholder="产品名称 / 描述关键词"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {/* 与后端 ListProductsQueryDto.keyword 的 MaxLength(120) 对齐：
              粘贴超长文本时直接截断，避免整页被 400 错误卡片顶替 */}
          <p className="text-caption text-text-muted">最多 120 个字符</p>
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="categoryId" className="text-small font-medium text-foreground">
            分类
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={categoryId ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
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
        <Link href={withFilters({ status: undefined })}>
          <Badge variant={!status ? 'default' : 'outline'} className="cursor-pointer">
            全部
          </Badge>
        </Link>
        {PRODUCT_STATUSES.map((s) => (
          <Link key={s} href={withFilters({ status: s })}>
            <Badge variant={status === s ? 'default' : 'outline'} className="cursor-pointer">
              {PRODUCT_STATUS_LABELS[s]}
            </Badge>
          </Link>
        ))}
      </div>

      {!productsResult.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载产品列表</p>
            <p className="text-small text-text-secondary">{friendlyQueryError(productsResult.error)}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
            {/* 兜底出口：筛选条件导致请求失败时，一键清除筛选回到完整列表，
                避免用户被错误卡片卡住、只能手动改 URL */}
            <div>
              <Button asChild variant="outline" size="sm">
                <Link href="/products">清除筛选条件</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : productsResult.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无产品</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || status || categoryId
                ? '当前筛选条件下没有产品，试试调整条件。'
                : '点击右上角「新建产品」创建第一个产品。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{productsResult.data.total}</span> 个产品
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">图片</th>
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {productsResult.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      {item.primaryImage ? (
                        // 后端返回的本地静态资源 URL（同源 /uploads/products/**）
                        // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
                        <img
                          src={item.primaryImage.url}
                          alt={item.primaryImage.altText ?? item.name}
                          className="size-10 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-md border border-dashed border-border text-caption text-text-muted">
                          无图
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                      {item.imageCount > 1 ? (
                        <span className="ml-2 text-caption text-text-muted">
                          {item.imageCount} 张图
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {item.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(item.status)}>
                        {PRODUCT_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {item.isFeatured ? '★ 是' : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/products/${item.id}/edit`}>编辑</Link>
                        </Button>
                        <DeleteProductButton id={item.id} name={item.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {productsResult.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/products/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                      <Badge variant={statusBadgeVariant(item.status)}>
                        {PRODUCT_STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <span className="text-small text-text-secondary">
                      {item.category?.name ?? '未分类'}
                      {item.isFeatured ? ' · Featured' : ''}
                    </span>
                    <span className="text-caption text-text-muted">
                      更新于 {formatDateTime(item.updatedAt)}
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/products/${item.id}/edit`}>编辑</Link>
                      </Button>
                      <DeleteProductButton id={item.id} name={item.name} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <Pagination
            page={productsResult.data.page}
            totalPages={productsResult.data.totalPages}
            buildHref={withFilters}
          />
        </>
      )}
    </Container>
  );
}

function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (next: { page?: number }) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <span className="text-small text-text-secondary">
        第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref({ page: page - 1 })}>上一页</Link>
          </Button>
        ) : null}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref({ page: page + 1 })}>下一页</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
