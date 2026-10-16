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
 * Media SEO（Phase 5.0，任务书十六节）
 *
 * 图片至少支持 alt / title / caption / description；Alt Text 是 SEO Audit
 * 的硬性检查项——缺失的图片排在最前并标红。图片文件本身仍在媒体库管理。
 */
export default async function SeoMediaPage() {
  const token = await getSessionToken();
  const result = await listMedia(token, { limit: 200, category: 'IMAGE' });

  const items = result.ok ? result.data.items : [];
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
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{items.length}</span> 张图片 · 缺失 Alt{' '}
            <span className={missingAlt.length > 0 ? 'font-medium text-red-700' : 'font-medium text-green-700'}>
              {missingAlt.length}
            </span>{' '}
            张（缺失项排在最前）
          </p>

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
