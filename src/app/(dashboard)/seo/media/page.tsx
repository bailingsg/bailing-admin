import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listMedia, type MediaAsset } from '@/lib/media';
import { SeoNav } from '../seo-nav';
import { MediaSeoEditor } from './media-seo-editor';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · Media SEO',
  description: '图片 SEO：Alt / Title / Caption / Description 管理。',
};

/**
 * 单页取多少条：**必须 ≤ 后端 ListMediaQueryDto 的 @Max(100)**。
 *
 * 历史缺陷：这里曾硬编码 `limit: 200`，被后端 400 拒绝（limit must not be
 * greater than 100），整页降级成「无法加载媒体库」，还把原因误报成
 * 「请确认后端服务已启动」。
 */
const MEDIA_PAGE_SIZE = 100;

/** 最多翻多少页（100 × 20 = 2000 张），避免极端数据量把页面拖死 */
const MEDIA_MAX_PAGES = 20;

interface MediaLoadResult {
  ok: boolean;
  items: MediaAsset[];
  /** 后端报告的总数（不是本页条数） */
  total: number;
  /** 是否因分页上限而只取到部分数据 */
  truncated: boolean;
  error?: string;
  status?: number;
}

/**
 * 按后端允许的页大小**翻页取全量图片**。
 *
 * 之前用「一次请求取 200 条」的方式，既超过后端上限，也无法覆盖更多图片；
 * 现在改为按 100/页顺序翻页，取到 totalPages 为止。
 */
async function loadAllImages(token: string | null): Promise<MediaLoadResult> {
  const first = await listMedia(token, {
    page: 1,
    limit: MEDIA_PAGE_SIZE,
    category: 'IMAGE',
  });

  if (!first.ok) {
    return {
      ok: false,
      items: [],
      total: 0,
      truncated: false,
      error: first.error,
      status: first.status,
    };
  }

  const items = [...first.data.items];
  const totalPages = Math.min(first.data.totalPages, MEDIA_MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await listMedia(token, {
      page,
      limit: MEDIA_PAGE_SIZE,
      category: 'IMAGE',
    });
    // 中途失败：保留已取到的数据继续展示，不再整页报错
    if (!next.ok) break;
    items.push(...next.data.items);
  }

  return {
    ok: true,
    items,
    total: first.data.total,
    truncated: first.data.totalPages > MEDIA_MAX_PAGES,
  };
}

/**
 * 媒体库加载失败的分类提示。
 *
 * 原提示把一切失败都说成「后端服务未启动」，掩盖了真正原因（参数超限、
 * 无权限、登录过期）。这里按 HTTP 状态码给出可执行的下一步。
 */
function mediaLoadErrorMessage(error: string, status: number | undefined): string {
  if (status === 0) return `无法连接后端服务（${error}）`;
  if (status === 401) return '登录已失效，请重新登录后再打开本页。';
  if (status === 403) return `当前账号没有读取媒体库的权限（media.read）：${error}`;
  if (status === 400) return `请求参数被后端拒绝：${error}`;
  if (status !== undefined && status >= 500) return `后端服务异常（HTTP ${status}）：${error}`;
  return error;
}

/**
 * Media SEO（Phase 5.0，任务书十六节）
 *
 * 图片至少支持 alt / title / caption / description；Alt Text 是 SEO Audit
 * 的硬性检查项——缺失的图片排在最前并标红。图片文件本身仍在媒体库管理。
 */
export default async function SeoMediaPage() {
  const token = await getSessionToken();
  const result = await loadAllImages(token);

  const items = result.ok ? result.items : [];
  const missingAlt = items.filter((item) => (item.altText ?? '').trim() === '');
  const sorted: MediaAsset[] = [...missingAlt, ...items.filter((item) => (item.altText ?? '').trim() !== '')];

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="图片 SEO"
        description="为图片补齐 Alt / Title / Caption / Description。Alt 缺失会同时被 SEO 审计标记为错误项。"
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载媒体库</p>
            <p className="text-small text-text-secondary">
              {mediaLoadErrorMessage(result.error ?? '未知错误', result.status)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.total}</span> 张图片 · 缺失 Alt{' '}
            <span className={missingAlt.length > 0 ? 'font-medium text-red-700' : 'font-medium text-green-700'}>
              {missingAlt.length}
            </span>{' '}
            张（缺失项排在最前）
          </p>
          {result.truncated ? (
            <p className="mt-1 text-caption text-warning-600">
              图片数量超过 {MEDIA_PAGE_SIZE * MEDIA_MAX_PAGES} 张，本页只展示前{' '}
              {MEDIA_PAGE_SIZE * MEDIA_MAX_PAGES} 张；其余请到「媒体资源」页面处理。
            </p>
          ) : null}

          {sorted.length === 0 ? (
            <Card className="mt-3">
              <CardContent className="py-10 text-center">
                <p className="text-body font-medium text-foreground">媒体库暂无图片</p>
                <p className="mt-1 text-small text-text-secondary">
                  上传图片后可在此管理 SEO 元数据。
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {sorted.map((item) => {
                const hasAlt = (item.altText ?? '').trim() !== '';
                return (
                  <Card key={item.id}>
                    <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 后台缩略图预览，无需优化 */}
                      <img
                        src={item.url}
                        alt={item.altText ?? ''}
                        className="size-16 shrink-0 rounded-md border border-border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-small font-medium text-foreground">{item.originalName}</p>
                        <p className="text-caption text-text-muted">
                          {item.width ?? '?'}×{item.height ?? '?'} · {item.mimeType}
                        </p>
                        <p className="mt-1 text-small text-text-secondary">
                          Alt：{hasAlt ? item.altText : <span className="text-red-700">缺失（SEO 审计错误项）</span>}
                        </p>
                        {item.caption ? (
                          <p className="text-caption text-text-muted">图注：{item.caption}</p>
                        ) : null}
                      </div>
                      <MediaSeoEditor media={item} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
