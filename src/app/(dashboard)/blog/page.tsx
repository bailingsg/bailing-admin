import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  listBlogCategories,
  listBlogPosts,
  POST_STATUSES,
  POST_STATUS_LABELS,
  type PostStatus,
} from '@/lib/blog';
import { BlogNav } from './blog-nav';
import { DeleteBlogPostButton } from './delete-post-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '博客管理',
  description: '管理官网博客文章：内容、分类、标签、封面与 SEO。',
};

const PAGE_SIZE = 20;

function isStatus(value: string | undefined): value is PostStatus {
  return value !== undefined && (POST_STATUSES as string[]).includes(value);
}

function statusBadgeVariant(status: PostStatus): 'success' | 'warning' {
  return status === 'PUBLISHED' ? 'success' : 'warning';
}

/**
 * 博客文章列表（Phase 4.4）。
 *
 * 数据来自后端 GET /api/v1/cms/blog/posts（JWT 保护）。
 * 筛选（keyword / status / categoryId）与分页均由 URL 查询参数驱动，服务端渲染。
 */
export default async function BlogPage({
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
  const [postsResult, categoriesResult] = await Promise.all([
    listBlogPosts(token, { page, limit: PAGE_SIZE, keyword, status, categoryId }),
    listBlogCategories(token),
  ]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];

  /** 保留当前筛选条件拼接分页链接 */
  const withFilters = (next: { page?: number; status?: PostStatus }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    const finalStatus = next.status === undefined ? status : next.status;
    if (finalStatus) search.set('status', finalStatus);
    if (keyword) search.set('keyword', keyword);
    if (categoryId) search.set('categoryId', categoryId);
    const query = search.toString();
    return query ? `/blog?${query}` : '/blog';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="博客管理"
        description="管理官网博客内容，配置分类、标签、封面图与 SEO 信息。"
        actions={
          <Button asChild size="sm">
            <Link href="/blog/create">新建文章</Link>
          </Button>
        }
      />

      <div className="mt-4">
        <BlogNav />
      </div>

      {/* 搜索 + 分类筛选（GET 表单，服务端渲染） */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/blog" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="标题 / slug / 摘要关键词"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
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
        {POST_STATUSES.map((s) => (
          <Link key={s} href={withFilters({ status: s })}>
            <Badge variant={status === s ? 'default' : 'outline'} className="cursor-pointer">
              {POST_STATUS_LABELS[s]}
            </Badge>
          </Link>
        ))}
      </div>

      {!postsResult.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载文章列表</p>
            <p className="text-small text-text-secondary">{postsResult.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : postsResult.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无文章</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || status || categoryId
                ? '当前筛选条件下没有文章，试试调整条件。'
                : '点击右上角「新建文章」创建第一篇内容。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{postsResult.data.total}</span> 篇文章
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">封面</th>
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium">标签</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">发布时间</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {postsResult.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      {item.coverImageUrl ? (
                        // 后端返回的静态资源 URL（同源 /uploads/media/**）
                        // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
                        <img
                          src={item.coverImageUrl}
                          alt={`${item.title} 封面`}
                          className="h-10 w-16 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-border text-caption text-text-muted">
                          无图
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/blog/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      {item.featured ? (
                        <span className="ml-2 text-caption text-warning-600">★ 精选</span>
                      ) : null}
                      <div className="text-caption text-text-muted">{item.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {item.category?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {item.tags.length > 0 ? item.tags.map((t) => t.name).join('、') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(item.status)}>
                        {POST_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                      {item.publishedAt ? formatDateTime(item.publishedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/blog/${item.id}/edit`}>编辑</Link>
                        </Button>
                        <DeleteBlogPostButton id={item.id} title={item.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {postsResult.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/blog/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <Badge variant={statusBadgeVariant(item.status)}>
                        {POST_STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <span className="text-small text-text-secondary">
                      {item.category?.name ?? '未分类'}
                      {item.tags.length > 0 ? ` · ${item.tags.map((t) => t.name).join('、')}` : ''}
                      {item.featured ? ' · ★ 精选' : ''}
                    </span>
                    <span className="text-caption text-text-muted">
                      更新于 {formatDateTime(item.updatedAt)}
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/blog/${item.id}/edit`}>编辑</Link>
                      </Button>
                      <DeleteBlogPostButton id={item.id} title={item.title} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {postsResult.data.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-small text-text-secondary">
                第 {postsResult.data.page} / {postsResult.data.totalPages} 页
              </span>
              <div className="flex gap-2">
                {postsResult.data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: postsResult.data.page - 1 })}>上一页</Link>
                  </Button>
                ) : null}
                {postsResult.data.page < postsResult.data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: postsResult.data.page + 1 })}>下一页</Link>
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
