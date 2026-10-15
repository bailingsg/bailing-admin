'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  POST_STATUSES,
  POST_STATUS_LABELS,
  type BlogCategory,
  type BlogPostDetail,
  type BlogTag,
} from '@/lib/blog';
import { saveBlogPostAction, type BlogFormState } from './actions';
import { RichTextEditor } from './rich-text-editor';
import { CoverPicker } from './cover-picker';

/**
 * 博客文章表单（创建 / 编辑复用）。
 *
 * 保存经服务端 Action 完成，JWT 不出服务端。
 * 正文由 RichTextEditor 写入隐藏字段；封面由 CoverPicker 写入 coverMediaId；
 * 标签由 TagSelector 写入 tagIdsJson。
 */

interface BlogPostFormProps {
  categories: BlogCategory[];
  tags: BlogTag[];
  /** 编辑模式传入文章详情；创建模式为 undefined */
  post?: BlogPostDetail;
}

const INITIAL_STATE: BlogFormState = { ok: false };

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const textareaClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

/** ISO → datetime-local 值（固定 Asia/Shanghai，避免时区差异） */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date);
  return formatted.replace(' ', 'T');
}

export function BlogPostForm({ categories, tags, post }: BlogPostFormProps) {
  const router = useRouter();
  const isEdit = post !== undefined;

  const boundAction = React.useCallback(
    (state: BlogFormState, formData: FormData) => saveBlogPostAction(post?.id ?? null, state, formData),
    [post?.id],
  );

  const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);

  // 创建成功 → 跳转编辑页
  React.useEffect(() => {
    if (state.ok && !isEdit && state.savedId) {
      router.push(`/blog/${state.savedId}/edit`);
    }
  }, [state.ok, state.savedId, isEdit, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-small text-destructive"
        >
          {state.error}
        </div>
      ) : null}
      {state.ok && isEdit ? (
        <div
          role="status"
          className="rounded-md border border-success-600/30 bg-success-50 px-4 py-3 text-small text-success-600"
        >
          已保存
        </div>
      ) : null}

      {/* ---------------------------- 基本信息 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="title" required>
              文章标题
            </Label>
            <input
              id="title"
              name="title"
              required
              minLength={2}
              maxLength={200}
              defaultValue={post?.title ?? ''}
              placeholder="如：2026 年板材出口趋势解读"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug" required>
              URL 标识（slug）
            </Label>
            <input
              id="slug"
              name="slug"
              required
              maxLength={200}
              defaultValue={post?.slug ?? ''}
              placeholder="如：plywood-export-trends-2026"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              className={inputClass}
            />
            <p className="text-caption text-text-muted">
              只能包含小写字母、数字与连字符，决定文章地址 /blog/[slug]
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryId">所属分类</Label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={post?.categoryId ?? ''}
              className={inputClass}
            >
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isActive ? '' : '（已停用）'}
                </option>
              ))}
            </select>
            {categories.length === 0 ? (
              <p className="text-caption text-warning-600">
                还没有分类，可到「分类管理」创建后再回来选择。
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="excerpt">摘要</Label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              maxLength={500}
              defaultValue={post?.excerpt ?? ''}
              placeholder="列表页与搜索引擎结果摘要（建议 150 字以内）"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 正文 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>文章正文</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor name="content" initialHtml={post?.content ?? ''} />
        </CardContent>
      </Card>

      {/* ---------------------------- 封面与标签 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>封面与标签</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <CoverPicker initialMedia={post?.coverMedia ?? null} />

          <TagSelector tags={tags} initialTagIds={post?.tagIds ?? []} />
        </CardContent>
      </Card>

      {/* ---------------------------- 发布与 SEO ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>发布状态与 SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">状态</Label>
            <select
              id="status"
              name="status"
              defaultValue={post?.status ?? 'DRAFT'}
              className={inputClass}
            >
              {POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {POST_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="text-caption text-text-muted">
              转为「已发布」且未填发布时间时，系统会自动记录当前时间
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publishedAt">发布时间</Label>
            <input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(post?.publishedAt)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              defaultChecked={post?.featured ?? false}
              className="size-4 rounded border-border accent-[var(--color-primary)]"
            />
            <Label htmlFor="featured">精选（首页 / 推荐位展示）</Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seoTitle">SEO 标题</Label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={200}
              defaultValue={post?.seoTitle ?? ''}
              placeholder="留空则使用文章标题"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="seoDescription">SEO 描述</Label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              maxLength={500}
              defaultValue={post?.seoDescription ?? ''}
              placeholder="Google / Bing 搜索结果摘要（150 字符左右为宜）"
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seoKeywords">SEO 关键词</Label>
            <input
              id="seoKeywords"
              name="seoKeywords"
              maxLength={500}
              defaultValue={post?.seoKeywords ?? ''}
              placeholder="逗号分隔，如 plywood,export,guide"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="canonicalUrl">规范链接（Canonical URL）</Label>
            <input
              id="canonicalUrl"
              name="canonicalUrl"
              maxLength={500}
              defaultValue={post?.canonicalUrl ?? ''}
              placeholder="跨站转载时指向原文，如 https://bailingwooden.com/blog/xxx"
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 社交分享（预留） ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>社交分享（Open Graph / Twitter Card）</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ogTitle">OG 标题</Label>
            <input
              id="ogTitle"
              name="ogTitle"
              maxLength={200}
              defaultValue={post?.ogTitle ?? ''}
              placeholder="留空则使用 SEO 标题"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ogImage">OG 图片地址</Label>
            <input
              id="ogImage"
              name="ogImage"
              maxLength={500}
              defaultValue={post?.ogImage ?? ''}
              placeholder="留空则使用封面图"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ogDescription">OG 描述</Label>
            <textarea
              id="ogDescription"
              name="ogDescription"
              rows={2}
              maxLength={500}
              defaultValue={post?.ogDescription ?? ''}
              placeholder="留空则使用 SEO 描述"
              className={textareaClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="twitterTitle">Twitter 标题</Label>
            <input
              id="twitterTitle"
              name="twitterTitle"
              maxLength={200}
              defaultValue={post?.twitterTitle ?? ''}
              placeholder="留空则使用 OG 标题"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="twitterDescription">Twitter 描述</Label>
            <input
              id="twitterDescription"
              name="twitterDescription"
              maxLength={500}
              defaultValue={post?.twitterDescription ?? ''}
              placeholder="留空则使用 OG 描述"
              className={inputClass}
            />
          </div>
          <p className="text-caption text-text-muted sm:col-span-2">
            以上字段为 Phase 4.4 预留：本阶段只做存储与透出，公开站接入时直接消费。
          </p>
        </CardContent>
      </Card>

      {/* ---------------------------- 提交 ---------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : isEdit ? '保存修改' : '创建文章'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          取消
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------ TagSelector ------------------------------ */

function TagSelector({ tags, initialTagIds }: { tags: BlogTag[]; initialTagIds: string[] }) {
  const [selected, setSelected] = React.useState<string[]>(initialTagIds);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="tag-selector">标签</Label>
      {tags.length === 0 ? (
        <p className="text-caption text-text-muted">
          还没有标签，可到「标签管理」创建后再回来选择。
        </p>
      ) : (
        <div id="tag-selector" className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selected.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(tag.id)}
                className={[
                  'rounded-full border px-3 py-1 text-caption font-medium transition-colors duration-[var(--duration-fast)]',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border-strong bg-background text-foreground hover:bg-accent',
                ].join(' ')}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-caption text-text-muted">已选 {selected.length} 个标签（最多 30 个）</p>
      <input type="hidden" name="tagIdsJson" value={JSON.stringify(selected)} readOnly />
    </div>
  );
}
