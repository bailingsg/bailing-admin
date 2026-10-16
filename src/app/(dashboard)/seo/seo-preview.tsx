'use client';

import { cn } from '@/lib/utils';

/**
 * SEO 社交预览（Phase 5.0，任务书四十一节）
 *
 * 纯 UI 预览，不调用任何第三方服务：
 *   · Google Preview —— 模拟搜索结果（标题 / URL / 描述，含截断提示）；
 *   · Facebook / LinkedIn Preview —— 模拟 og 卡片（大图 + 域名 + 标题 + 描述）。
 */

export interface SeoPreviewValues {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  siteName?: string;
}

const GOOGLE_TITLE_MAX = 60;
const GOOGLE_DESC_MAX = 160;

function truncate(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: `${text.slice(0, max).trimEnd()}…`, truncated: true };
}

/** URL 展示形态：去协议、去末尾斜杠 */
function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '') || 'bailingwooden.com';
}

export function GooglePreview({ title, description, url }: SeoPreviewValues) {
  const t = truncate(title, GOOGLE_TITLE_MAX);
  const d = truncate(description, GOOGLE_DESC_MAX);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-text-muted">
          B
        </span>
        <span className="text-caption text-text-muted">{prettyUrl(url)}</span>
      </div>
      <p className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer">{t.text}</p>
      <p className="text-small leading-relaxed text-[#4d5156]">{d.text}</p>
      {(t.truncated || d.truncated) && (
        <p className="text-caption text-amber-600">
          ⚠ {t.truncated ? `标题超出 ${GOOGLE_TITLE_MAX} 字符将被截断` : ''}
          {t.truncated && d.truncated ? '；' : ''}
          {d.truncated ? `描述超出 ${GOOGLE_DESC_MAX} 字符将被截断` : ''}
        </p>
      )}
    </div>
  );
}

export function SocialPreview({ title, description, url, image, siteName }: SeoPreviewValues) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      {image ? (
        <div className="flex h-40 items-center justify-center bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- 预览用途，无需 next/image 优化 */}
          <img src={image} alt="" className="max-h-40 w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-muted text-caption text-text-muted">
          未设置 OG 图片（将使用站点默认图）
        </div>
      )}
      <div className="flex flex-col gap-1 border-t border-border p-3">
        <span className="text-caption uppercase tracking-wide text-text-muted">
          {prettyUrl(url)}
        </span>
        <p className="text-body font-medium text-foreground">{title || '（未设置标题）'}</p>
        <p className="line-clamp-2 text-small text-text-secondary">
          {description || '（未设置描述）'}
        </p>
        {siteName ? <span className="text-caption text-text-muted">{siteName}</span> : null}
      </div>
    </div>
  );
}

/** 预览面板（Google + 社交并排，移动端堆叠） */
export function SeoPreviewPanel({
  title,
  description,
  url,
  image,
  siteName,
  className,
}: SeoPreviewValues & { className?: string }) {
  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      <div className="flex flex-col gap-2">
        <h4 className="text-small font-medium text-foreground">Google 预览</h4>
        <GooglePreview title={title} description={description} url={url} />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-small font-medium text-foreground">Facebook / LinkedIn 预览</h4>
        <SocialPreview
          title={title}
          description={description}
          url={url}
          image={image}
          siteName={siteName}
        />
      </div>
    </div>
  );
}
