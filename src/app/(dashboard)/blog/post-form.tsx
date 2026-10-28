'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { type BlogCategory, type BlogPostDetail, type BlogTag } from '@/lib/blog';
import { type CmsProductListItem } from '@/lib/products';
import { saveBlogPostAction, type BlogFormState } from './actions';
import { RichTextEditor } from './rich-text-editor';
import { CoverPicker } from './cover-picker';
import { useFormToast } from '@/lib/use-form-toast';

/**
 * 博客文章表单（创建 / 编辑复用）。
 *
 * 保存经服务端 Action 完成，JWT 不出服务端。
 * 正文由 RichTextEditor 写入隐藏字段；封面由 CoverPicker 写入 coverMediaId；
 * 标签由 TagSelector 写入 tagIdsJson；关联产品由 RelatedProductsPicker 写入 relatedProductIdsJson。
 */

/** 一篇最多关联的产品数（与后端 MAX_RELATED_PRODUCTS 一致） */
const MAX_RELATED_PRODUCTS = 4;

interface BlogPostFormProps {
  categories: BlogCategory[];
  tags: BlogTag[];
  /** 可关联的产品（最多取前 100 个，供选择器本地搜索） */
  products: CmsProductListItem[];
  /** 编辑模式传入文章详情；创建模式为 undefined */
  post?: BlogPostDetail;
}

const INITIAL_STATE: BlogFormState = { ok: false };

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const textareaClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

export function BlogPostForm({ categories, tags, products, post }: BlogPostFormProps) {
  const router = useRouter();
  const isEdit = post !== undefined;

  const boundAction = React.useCallback(
    (state: BlogFormState, formData: FormData) => saveBlogPostAction(post?.id ?? null, state, formData),
    [post?.id],
  );

  const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);

  // 保存结果走顶部气泡：保存按钮在页面最底部，顶部内联提示看不见
  useFormToast(state, { successMessage: isEdit ? '文章已保存' : '文章已创建' });

  // 创建成功 → 跳转编辑页
  React.useEffect(() => {
    if (state.ok && !isEdit && state.savedId) {
      router.push(`/blog/${state.savedId}/edit`);
    }
  }, [state.ok, state.savedId, isEdit, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
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
          <RichTextEditor
            name="content"
            initialHtml={post?.content ?? ''}
            uploadUsage="BLOG"
          />
        </CardContent>
      </Card>

      {/* ---------------------------- 封面 / 标签 / 关联产品 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>封面、标签与关联产品</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <CoverPicker initialMedia={post?.coverMedia ?? null} />

          <TagSelector tags={tags} initialTagIds={post?.tagIds ?? []} />

          <RelatedProductsPicker
            products={products}
            initialSelectedIds={post?.relatedProductIds ?? []}
          />
        </CardContent>
      </Card>

      {/* ---------------------------- SEO ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
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

          <p className="text-caption text-text-muted">
            发布状态与发布时间由右上角「发布」面板控制，保存不会改变线上版本。
          </p>

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

/* --------------------------- RelatedProductsPicker --------------------------- */

const PRODUCT_STATUS_LABELS: Record<CmsProductListItem['status'], string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  UNPUBLISHED: '已下架',
  ARCHIVED: '已归档',
};

/**
 * 关联产品选择器（Phase 5.6）。
 *
 * 前台文章详情页的「相关产品」区块直接消费本字段，最多 4 个、按选择顺序展示。
 * 只写隐藏字段 relatedProductIdsJson，保存逻辑在服务端 Action。
 * 未发布产品可被选择（便于排期），但前台不会展示——此处用状态标签提示。
 */
function RelatedProductsPicker({
  products,
  initialSelectedIds,
}: {
  products: CmsProductListItem[];
  initialSelectedIds: string[];
}) {
  const [selected, setSelected] = React.useState<string[]>(initialSelectedIds);
  const [query, setQuery] = React.useState('');

  const byId = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectedProducts = selected
    .map((id) => byId.get(id))
    .filter((p): p is CmsProductListItem => p !== undefined);

  const candidates = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((product) => !selected.includes(product.id))
      .filter((product) =>
        q === ''
          ? true
          : product.name.toLowerCase().includes(q) || product.slug.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, selected, query]);

  const reachedLimit = selected.length >= MAX_RELATED_PRODUCTS;

  function add(id: string) {
    setSelected((current) =>
      current.includes(id) || current.length >= MAX_RELATED_PRODUCTS ? current : [...current, id],
    );
    setQuery('');
  }

  function remove(id: string) {
    setSelected((current) => current.filter((item) => item !== id));
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor="related-products-search">关联产品</Label>

      {selectedProducts.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {selectedProducts.map((product, index) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-medium text-primary">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-small text-foreground" title={product.name}>
                  {product.name}
                </span>
                <span
                  className="hidden max-w-56 shrink-0 truncate text-caption text-text-muted sm:inline"
                  title={`/${product.slug}`}
                >
                  /{product.slug}
                </span>
                {product.status !== 'PUBLISHED' ? (
                  <span className="shrink-0 rounded-full border border-border-strong bg-muted px-2 py-0.5 text-caption font-medium text-text-secondary">
                    {PRODUCT_STATUS_LABELS[product.status]}·前台不展示
                  </span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => remove(product.id)}
                aria-label={`移除关联产品 ${product.name}`}
              >
                移除
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-caption text-text-muted">
          还没有关联产品。关联后会在文章详情页底部展示「相关产品」卡片。
        </p>
      )}

      {products.length === 0 ? (
        <p className="text-caption text-text-secondary">
          产品库为空或无法读取产品列表，请确认后端与产品数据。
        </p>
      ) : reachedLimit ? (
        <p className="text-caption text-text-muted">
          已达上限 {MAX_RELATED_PRODUCTS} 个，如需更换请先移除其中一个。
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            id="related-products-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索产品名称或 slug 后点击添加"
            className={inputClass}
          />
          {query.trim() !== '' ? (
            candidates.length > 0 ? (
              <ul className="max-h-56 overflow-y-auto rounded-md border border-border">
                {candidates.map((product) => (
                  <li key={product.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => add(product.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-small text-foreground">{product.name}</span>
                        <span className="truncate text-caption text-text-muted">/{product.slug}</span>
                      </span>
                      <span className="shrink-0 text-caption text-text-secondary">
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-text-muted">没有匹配的产品。</p>
            )
          ) : null}
        </div>
      )}

      <p className="text-caption text-text-muted">
        已选 {selected.length} / {MAX_RELATED_PRODUCTS} 个（前台按此顺序展示，仅已发布产品可见）
      </p>
      <input
        type="hidden"
        name="relatedProductIdsJson"
        value={JSON.stringify(selected)}
        readOnly
      />
    </div>
  );
}
