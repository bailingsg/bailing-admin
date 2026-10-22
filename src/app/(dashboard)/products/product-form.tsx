'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import {
  type CmsCategory,
  type CmsProductDetail,
  type ProductStatus,
} from '@/lib/products';
import { saveProductAction, type ProductFormState } from './actions';

/**
 * 产品表单（创建 / 编辑复用）。
 *
 * 规格参数使用 JSON 文本框（提交前校验格式）；
 * 应用标签使用 TagInput（写入隐藏字段 applicationsJson）。
 * 保存经服务端 Action 完成，JWT 不出服务端。
 */

interface ProductFormProps {
  categories: CmsCategory[];
  /** 编辑模式传入产品详情；创建模式为 undefined */
  product?: CmsProductDetail;
}

const INITIAL_STATE: ProductFormState = { ok: false };

/**
 * 简短描述字数上限。
 *
 * 与后端 CreateProductDto / UpdateProductDto 的 @MaxLength 保持一致
 * （bailing-backend/src/modules/cms/products/dto/product.dto.ts）：
 * 它是列表卡片与 SEO 摘要的唯一来源，历史迁移数据曾灌入 300+ 字段落，
 * 把前台产品卡片撑到一屏放不下一张。这里定死 100 字。
 */
const SHORT_DESCRIPTION_MAX = 100;

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = product !== undefined;

  const boundAction = React.useCallback(
    (state: ProductFormState, formData: FormData) =>
      saveProductAction(product?.id ?? null, state, formData),
    [product?.id],
  );

  const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);

  // 简短描述实时字数（输入即刷新；编辑旧数据可能已超限，首次渲染即标红）
  const [shortDescriptionCount, setShortDescriptionCount] = React.useState(() =>
    product?.shortDescription ? product.shortDescription.length : 0,
  );

  // 创建成功 → 跳转编辑页（继续上传图片）
  React.useEffect(() => {
    if (state.ok && !isEdit && state.savedId) {
      router.push(`/products/${state.savedId}/edit`);
    }
  }, [state.ok, state.savedId, isEdit, router]);

  const specificationsInitial = product?.specifications
    ? JSON.stringify(product.specifications, null, 2)
    : '';

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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" required>
              产品名称
            </Label>
            <input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={product?.name ?? ''}
              placeholder="如：18mm Oak Plywood"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
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
              defaultValue={product?.slug ?? ''}
              placeholder="如：18mm-oak-plywood"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <p className="text-caption text-text-muted">
              只能包含小写字母、数字与连字符；公开产品页地址按 id 生成（/products/[id]），
              slug 用于后台识别与旧链接兼容
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryId" required>
              产品分类
            </Label>
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={product?.categoryId ?? ''}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="" disabled>
                请选择分类
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 ? (
              <p className="text-caption text-warning-600">
                还没有分类，请先到「Categories」页面创建。
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="material">材质说明</Label>
            <input
              id="material"
              name="material"
              maxLength={300}
              defaultValue={product?.material ?? ''}
              placeholder="如：Oak / MDF / Particleboard"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="shortDescription">简短描述</Label>
            <input
              id="shortDescription"
              name="shortDescription"
              maxLength={SHORT_DESCRIPTION_MAX}
              defaultValue={product?.shortDescription ?? ''}
              placeholder="一句话描述，用于列表卡片与 SEO 摘要"
              onChange={(event) => setShortDescriptionCount(event.target.value.length)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {/*
              简短描述上限 100 字：它是列表卡片与 SEO 摘要的唯一来源，
              超长会把卡片撑到一屏放不下（内容迁移后的实际事故）。
              这里同时做「输入截断 + 实时计数 + 校验提示」三道约束。
            */}
            <p className="text-caption text-text-muted">
              最多 100 字（{shortDescriptionCount}/{SHORT_DESCRIPTION_MAX}）；超出部分由后端拒绝。
              旧数据超过 100 字时请在保存前手动精简，否则保存会报 400。
            </p>
            {shortDescriptionCount > SHORT_DESCRIPTION_MAX ? (
              <p className="text-caption text-warning-600">
                已超出 {shortDescriptionCount - SHORT_DESCRIPTION_MAX} 字，请精简后再保存
              </p>
            ) : null}
          </div>

          {/*
            详细描述改用富文本编辑器（与博客正文同一组件）：
            · 写入隐藏 input name="description"，HTML 随表单提交
            · 后端 ProductsService 入库前经 sanitizeRichText 白名单净化
            · 前台详情页用 product-prose 样式渲染该 HTML
          */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <RichTextEditor
              name="description"
              initialHtml={product?.description ?? ''}
              label="详细描述"
              placeholder="产品详细介绍、规格、应用场景等；可用 H2/H3 分节、列表、表格说明"
              minHeightClass="min-h-80"
              hint="支持标题、加粗、列表、表格、链接与媒体库图片；保存时后端会自动过滤不安全标签与属性。"
              uploadUsage="PRODUCT"
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 标签与规格 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>应用标签与规格参数</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <TagInput
            name="applications"
            initialTags={product?.applications ?? []}
            label="应用标签"
            hint="输入后按回车添加，如 Furniture / Construction"
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="specifications">规格参数（JSON）</Label>
            <textarea
              id="specifications"
              name="specifications"
              rows={6}
              spellCheck={false}
              defaultValue={specificationsInitial}
              placeholder={'{\n  "thickness": "18mm",\n  "size": "1220x2440mm"\n}'}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <p className="text-caption text-text-muted">
              键值对 JSON 对象（最多 50 项），留空表示不设置
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- SEO 与推荐 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>SEO 与推荐位</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {/* Phase 1：发布状态不在此处设置——上线与下架只能经编辑页的「发布」面板 */}
          <div className="flex items-center gap-2 sm:pt-6">
            <input
              id="isFeatured"
              name="isFeatured"
              type="checkbox"
              defaultChecked={product?.isFeatured ?? false}
              className="size-4 rounded border-border accent-[var(--color-primary)]"
            />
            <Label htmlFor="isFeatured">Featured（首页/推荐位展示）</Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seoTitle">SEO 标题</Label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={200}
              defaultValue={product?.seoTitle ?? ''}
              placeholder="留空则使用产品名称"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seoDescription">SEO 描述</Label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              maxLength={500}
              rows={2}
              defaultValue={product?.seoDescription ?? ''}
              placeholder="搜索引擎结果摘要（150 字符左右为宜）"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 提交 ---------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : isEdit ? '保存修改' : '创建产品'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          取消
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------ TagInput ------------------------------ */

interface TagInputProps {
  name: string;
  label: string;
  hint?: string;
  initialTags: string[];
}

/**
 * 标签输入：回车/逗号添加，× 删除。
 * 值以 JSON 数组写入隐藏字段（name 对应），提交时供服务端解析。
 */
function TagInput({ name, label, hint, initialTags }: TagInputProps) {
  const [tags, setTags] = React.useState<string[]>(initialTags);
  const [draft, setDraft] = React.useState('');

  function addTag() {
    const value = draft.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setDraft('');
      return;
    }
    if (tags.length >= 20) return;
    setTags([...tags, value]);
    setDraft('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${name}-input`}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-caption font-medium text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`移除标签 ${tag}`}
              onClick={() => removeTag(tag)}
              className="rounded-full outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={`${name}-input`}
          value={draft}
          maxLength={60}
          placeholder={tags.length > 0 ? '继续添加…' : '输入标签后按回车'}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
          className="h-9 min-w-48 flex-1 rounded-md border border-border bg-background px-3 text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
      {/* 服务端读取的序列化值 */}
      <input type="hidden" name={`${name}Json`} value={JSON.stringify(tags)} readOnly />
    </div>
  );
}

export type { ProductStatus };
