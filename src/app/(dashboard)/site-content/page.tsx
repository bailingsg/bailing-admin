import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import {
  CONTENT_STATUS_LABELS,
  CONTENT_STATUSES,
  SITE_PAGE_LABELS,
  listSiteSections,
  type ContentStatus,
  type SitePageKey,
} from '@/lib/rbac';
import { SectionFormModal } from './section-form-modal';
import { DeleteSectionButton } from './delete-section-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '站点内容',
  description: '管理首页 / 关于我们 / 联系页的结构化内容分区。',
};

const PAGE_SIZE = 20;

function isSitePage(value: string | undefined): value is SitePageKey {
  return value === 'HOME' || value === 'ABOUT' || value === 'CONTACT';
}

function isStatus(value: string | undefined): value is ContentStatus {
  return value !== undefined && (CONTENT_STATUSES as string[]).includes(value);
}

/**
 * 站点内容列表（Phase 4.7）。
 *
 * 结构化分区（定式字段：眉题 / 标题 / 副标题 / 正文 / 媒体 / CTA / 卡片 / 统计项），
 * **不是页面构建器**；发布后由前台公开 API（/public/site/:page）消费。
 */
export default async function SiteContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; status?: string; sitePage?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const status = isStatus(params.status) ? params.status : undefined;
  const sitePage = isSitePage(params.sitePage) ? params.sitePage : undefined;

  const token = await getSessionToken();
  const result = await listSiteSections(token, {
    pageNum: page,
    pageSize: PAGE_SIZE,
    keyword,
    status,
    page: sitePage,
  });

  const withFilters = (next: { page?: number; status?: ContentStatus; sitePage?: SitePageKey }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    if (keyword) search.set('keyword', keyword);
    const finalStatus = next.status === undefined ? status : next.status;
    if (finalStatus) search.set('status', finalStatus);
    const finalSitePage = next.sitePage === undefined ? sitePage : next.sitePage;
    if (finalSitePage) search.set('sitePage', finalSitePage);
    const query = search.toString();
    return query ? `/site-content?${query}` : '/site-content';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="站点内容"
        description="管理首页 / 关于我们 / 联系页的结构化内容分区。发布后由前台公开 API 实时消费，草稿与归档不对外。"
        actions={<SectionFormModal mode="create" triggerLabel="新建分区" />}
      />

      {/* 搜索 + 页面筛选 */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/site-content" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="分区标题 / 分区键"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor="sitePage" className="text-small font-medium text-foreground">
            所属页面
          </label>
          <select
            id="sitePage"
            name="sitePage"
            defaultValue={sitePage ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部页面</option>
            {(Object.keys(SITE_PAGE_LABELS) as SitePageKey[]).map((key) => (
              <option key={key} value={key}>
                {SITE_PAGE_LABELS[key]}
              </option>
            ))}
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
            <p className="text-body font-medium text-foreground">无法加载站点分区列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无站点分区</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || status || sitePage
                ? '当前筛选条件下没有分区，试试调整条件。'
                : '点击右上角「新建分区」创建第一个结构化内容分区。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 个分区
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">页面 / 分区键</th>
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">内容构成</th>
                  <th className="px-4 py-3 font-medium">发布状态</th>
                  <th className="px-4 py-3 font-medium">排序</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      <Badge variant="outline">{SITE_PAGE_LABELS[item.page]}</Badge>
                      <div className="mt-1 font-mono text-caption text-text-muted">{item.sectionKey}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{item.title ?? '—'}</span>
                      {item.eyebrow ? (
                        <div className="text-caption text-text-muted">{item.eyebrow}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                      {[
                        item.body ? '正文' : null,
                        item.items.length > 0 ? `卡片 ${item.items.length}` : null,
                        item.stats.length > 0 ? `统计 ${item.stats.length}` : null,
                        item.media ? '配图' : null,
                        item.ctaUrl ? 'CTA' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'success'
                            : item.status === 'ARCHIVED'
                              ? 'muted'
                              : 'warning'
                        }
                      >
                        {CONTENT_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <SectionFormModal
                          mode="edit"
                          triggerLabel="编辑"
                          section={item}
                        />
                        <DeleteSectionButton
                          id={item.id}
                          label={`${SITE_PAGE_LABELS[item.page]} / ${item.sectionKey}`}
                        />
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{SITE_PAGE_LABELS[item.page]}</Badge>
                          <span className="font-medium text-foreground">{item.title ?? '未标题'}</span>
                        </div>
                        <span className="font-mono text-caption text-text-muted">{item.sectionKey}</span>
                      </div>
                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'success'
                            : item.status === 'ARCHIVED'
                              ? 'muted'
                              : 'warning'
                        }
                      >
                        {CONTENT_STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <span className="text-small text-text-secondary">
                      {item.body ? '正文' : null}
                      {item.items.length > 0 ? ` · 卡片 ${item.items.length}` : null}
                      {item.stats.length > 0 ? ` · 统计 ${item.stats.length}` : null}
                      {item.media ? ' · 配图' : null}
                      {item.ctaUrl ? ' · CTA' : null} · 排序 {item.sortOrder}
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <SectionFormModal
                        mode="edit"
                        triggerLabel="编辑"
                        section={item}
                      />
                      <DeleteSectionButton
                        id={item.id}
                        label={`${SITE_PAGE_LABELS[item.page]} / ${item.sectionKey}`}
                      />
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
