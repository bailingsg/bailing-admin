import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  listApplications,
  type ContentStatus,
} from '@/lib/enterprise';
import { DeleteApplicationButton } from './delete-application-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '产品应用场景',
  description: '管理产品应用场景及其关联产品。',
};

const PAGE_SIZE = 20;

/** 推荐筛选三态：全部 / 推荐 / 非推荐 */
type FeaturedFilter = 'all' | 'yes' | 'no';

function isStatus(value: string | undefined): value is ContentStatus {
  return value !== undefined && (CONTENT_STATUSES as string[]).includes(value);
}

function parseFeatured(value: string | undefined): FeaturedFilter {
  if (value === 'true' || value === 'yes') return 'yes';
  if (value === 'false' || value === 'no') return 'no';
  return 'all';
}

/**
 * 产品应用场景列表（Phase 4.5）。
 *
 * 列：封面 / 场景名称 / 关联产品数 / 发布状态 / 是否推荐 / 排序 / 操作。
 * 关联产品为显式多对多，删除场景不会删除产品。
 */
export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    keyword?: string;
    status?: string;
    featured?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const status = isStatus(params.status) ? params.status : undefined;
  const featuredFilter = parseFeatured(params.featured);
  const featured = featuredFilter === 'all' ? undefined : featuredFilter === 'yes';

  const token = await getSessionToken();
  const result = await listApplications(token, {
    page,
    limit: PAGE_SIZE,
    keyword,
    status,
    featured,
  });

  const withFilters = (next: {
    page?: number;
    status?: ContentStatus;
    featured?: FeaturedFilter;
  }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    if (keyword) search.set('keyword', keyword);
    const finalStatus = next.status === undefined ? status : next.status;
    if (finalStatus) search.set('status', finalStatus);
    const finalFeatured = next.featured ?? featuredFilter;
    if (finalFeatured !== 'all') {
      search.set('featured', finalFeatured === 'yes' ? 'true' : 'false');
    }
    const query = search.toString();
    return query ? `/applications?${query}` : '/applications';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="产品应用场景"
        description="按使用场景组织产品（如家具制造、包装、建筑装饰），并建立与产品的显式关联。"
        actions={
          <Button asChild size="sm">
            <Link href="/applications/create">新建场景</Link>
          </Button>
        }
      />

      {/* 搜索 + 推荐筛选 */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/applications" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="场景名称 / slug"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor="featured" className="text-small font-medium text-foreground">
            推荐状态
          </label>
          <select
            id="featured"
            name="featured"
            defaultValue={featuredFilter === 'all' ? '' : featuredFilter === 'yes' ? 'true' : 'false'}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部</option>
            <option value="true">仅推荐</option>
            <option value="false">非推荐</option>
          </select>
        </div>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Button type="submit" variant="outline" size="default">
          筛选
        </Button>
      </form>

      {/* 发布状态筛选 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={withFilters({ page: 1, status: undefined })}>
          <Badge variant={!status ? 'default' : 'outline'} className="cursor-pointer">
            全部状态
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
            <p className="text-body font-medium text-foreground">无法加载应用场景列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无应用场景</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || status || featuredFilter !== 'all'
                ? '当前筛选条件下没有场景，试试调整条件。'
                : '点击右上角「新建场景」创建第一个应用场景。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 个场景
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">封面</th>
                  <th className="px-4 py-3 font-medium">场景名称</th>
                  <th className="px-4 py-3 font-medium">关联产品数</th>
                  <th className="px-4 py-3 font-medium">发布状态</th>
                  <th className="px-4 py-3 font-medium">是否推荐</th>
                  <th className="px-4 py-3 font-medium">排序</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      {item.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImageUrl}
                          alt={item.name}
                          className="h-12 w-16 rounded-sm border border-border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-12 w-16 items-center justify-center rounded-sm bg-muted text-caption text-text-muted">
                          无封面
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/applications/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                      <div className="text-caption text-text-muted">{item.slug}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                      {item.productCount} 个
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === 'PUBLISHED' ? 'success' : 'warning'}>
                        {CONTENT_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {item.featured ? (
                        <Badge variant="default">推荐</Badge>
                      ) : (
                        <span className="text-small text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/applications/${item.id}/edit`}>编辑</Link>
                        </Button>
                        <DeleteApplicationButton id={item.id} name={item.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start gap-3">
                      {item.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImageUrl}
                          alt={item.name}
                          className="h-14 w-20 shrink-0 rounded-sm border border-border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-sm bg-muted text-caption text-text-muted">
                          无封面
                        </span>
                      )}
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/applications/${item.id}/edit`}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                          <Badge variant={item.status === 'PUBLISHED' ? 'success' : 'warning'}>
                            {CONTENT_STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                        <span className="text-caption text-text-muted">{item.slug}</span>
                        <span className="text-small text-text-secondary">
                          关联产品 {item.productCount} 个 · 排序 {item.sortOrder}
                          {item.featured ? ' · 推荐' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/applications/${item.id}/edit`}>编辑</Link>
                      </Button>
                      <DeleteApplicationButton id={item.id} name={item.name} />
                    </div>
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
