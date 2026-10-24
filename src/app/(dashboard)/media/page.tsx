import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listMedia, MEDIA_USAGES, type MediaUsage } from '@/lib/media';
import { MediaLibrary } from './media-library';
import { withBasePath } from '@/lib/base-path';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '媒体资源库',
  description: '上传与管理官网图片资源：用途分类、画廊、预览、引用保护删除。',
};

const PAGE_SIZE = 24;

/** 合法用途值集合（URL 参数防注入） */
const USAGE_VALUES = new Set<string>(MEDIA_USAGES.map((item) => item.value));

/** 筛选 chip 样式（用途 / 引用状态两行共用） */
const CHIP_BASE = 'rounded-full border px-3 py-1 text-caption font-medium transition-colors';
const CHIP_ACTIVE = 'border-primary bg-primary text-primary-foreground';
const CHIP_INACTIVE = 'border-border-strong bg-background text-foreground hover:bg-accent';

/** URL 查询参数 referenced → boolean（非法值视为未筛选） */
function parseReferenced(raw: string | undefined): boolean | undefined {
  const value = raw?.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/**
 * 媒体资源库（Phase 4.3）。
 *
 * 数据来自后端 GET /api/v1/cms/media（JWT 保护）。
 * 搜索（keyword）、用途（usage）、引用状态（referenced）与分页均由 URL 查询参数驱动，服务端渲染。
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; usage?: string; referenced?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const rawUsage = params.usage?.trim() ?? '';
  const usage = USAGE_VALUES.has(rawUsage) ? (rawUsage as MediaUsage) : undefined;
  const referenced = parseReferenced(params.referenced);

  const token = await getSessionToken();
  const mediaResult = await listMedia(token, { page, limit: PAGE_SIZE, keyword, usage, referenced });

  /**
   * 保留当前筛选条件构造翻页 / 切换筛选链接。
   * 用 `in` 区分「未传该键（保留当前值，如翻页）」与「显式传 undefined（清除该筛选）」。
   */
  const withFilters = (next: {
    page?: number;
    usage?: MediaUsage | undefined;
    referenced?: boolean | undefined;
  }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    const finalUsage = 'usage' in next ? next.usage : usage;
    const finalReferenced = 'referenced' in next ? next.referenced : referenced;
    if (finalPage > 1) search.set('page', String(finalPage));
    if (keyword) search.set('keyword', keyword);
    if (finalUsage) search.set('usage', finalUsage);
    if (finalReferenced !== undefined) search.set('referenced', String(finalReferenced));
    const query = search.toString();
    return query ? `/media?${query}` : '/media';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="媒体资源库"
        description="上传官网图片（JPEG / PNG / WebP / AVIF），按用途归类（文章 / 产品 / 证书 / 工厂 / 生产 / 装车等）；被引用的媒体不可直接删除，可按「未被引用」筛选出可安全清理的图片。"
      />

      {/* 用途筛选（GET 链接，服务端渲染） */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-small font-medium text-foreground">用途</span>
        <Link
          href={withFilters({ usage: undefined, page: 1 })}
          className={`${CHIP_BASE} ${
            usage ? CHIP_INACTIVE : CHIP_ACTIVE
          }`}
        >
          全部
        </Link>
        {MEDIA_USAGES.map((item) => {
          const active = usage === item.value;
          return (
            <Link
              key={item.value}
              href={withFilters({ usage: item.value, page: 1 })}
              title={item.hint}
              className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* 引用状态筛选：未被引用 = 无任何业务记录使用，可安全清理 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-small font-medium text-foreground">引用</span>
        <Link
          href={withFilters({ referenced: undefined, page: 1 })}
          className={`${CHIP_BASE} ${
            referenced === undefined ? CHIP_ACTIVE : CHIP_INACTIVE
          }`}
        >
          全部
        </Link>
        <Link
          href={withFilters({ referenced: false, page: 1 })}
          className={`${CHIP_BASE} ${
            referenced === false ? CHIP_ACTIVE : CHIP_INACTIVE
          }`}
        >
          未被引用
        </Link>
        <Link
          href={withFilters({ referenced: true, page: 1 })}
          className={`${CHIP_BASE} ${
            referenced === true ? CHIP_ACTIVE : CHIP_INACTIVE
          }`}
        >
          已被引用
        </Link>
      </div>

      {/* 搜索（GET 表单，服务端渲染） */}
      <form className="mt-4 flex flex-wrap items-end gap-3" action={withBasePath('/media')} method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="原始文件名 / 存储文件名关键词"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        {usage ? <input type="hidden" name="usage" value={usage} /> : null}
        {referenced === undefined ? null : (
          <input type="hidden" name="referenced" value={String(referenced)} />
        )}
        <Button type="submit" variant="outline" size="default">
          筛选
        </Button>
      </form>

      {!mediaResult.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载媒体列表</p>
            <p className="text-small text-text-secondary">{mediaResult.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{mediaResult.data.total}</span> 个媒体
            {usage ? (
              <>
                （用途「
                <span className="text-foreground">
                  {MEDIA_USAGES.find((item) => item.value === usage)?.label ?? usage}
                </span>
                」）
              </>
            ) : null}
            {keyword ? (
              <>
                （关键词「<span className="text-foreground">{keyword}</span>」）
              </>
            ) : null}
            {referenced !== undefined ? (
              <>
                （
                <span className="text-foreground">{referenced ? '已被引用' : '未被引用'}</span>
                ）
              </>
            ) : null}
          </p>

          <MediaLibrary assets={mediaResult.data.items} />

          {mediaResult.data.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-small text-text-secondary">
                第 {mediaResult.data.page} / {mediaResult.data.totalPages} 页
              </span>
              <div className="flex gap-2">
                {mediaResult.data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: mediaResult.data.page - 1 })}>上一页</Link>
                  </Button>
                ) : null}
                {mediaResult.data.page < mediaResult.data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: mediaResult.data.page + 1 })}>下一页</Link>
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
