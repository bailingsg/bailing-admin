'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { mediaTypeLabel, type MediaAsset } from '@/lib/media';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  type ApplicationDetail,
} from '@/lib/enterprise';
import { saveApplicationAction, type ApplicationFormState } from './actions';
import { ApplicationCoverPicker } from './cover-picker';
import { ProductPickerModal, type SelectedProduct } from './product-picker';

/**
 * 应用场景表单（创建 / 编辑复用，Phase 4.5）。
 *
 * 关联产品通过显式多对多（ApplicationProduct）建立：
 * 前端维护 productId 数组，提交时写入隐藏字段 productIdsJson，
 * 服务端 Actions 解析后发送 products: [{ productId, sortOrder }]。
 * 不使用产品名称字符串匹配，删除场景也不会删除产品。
 */

interface ApplicationFormProps {
  application?: ApplicationDetail;
}

const INITIAL_STATE: ApplicationFormState = { ok: false };

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const textareaClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

interface PickedProduct {
  id: string;
  name: string;
  slug: string;
}

/** ISO → datetime-local 值 */
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

export function ApplicationForm({ application }: ApplicationFormProps) {
  const router = useRouter();
  const isEdit = application !== undefined;

  const boundAction = React.useCallback(
    (state: ApplicationFormState, formData: FormData) =>
      saveApplicationAction(application?.id ?? null, state, formData),
    [application?.id],
  );
  const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);

  React.useEffect(() => {
    if (state.ok && !isEdit && state.savedId) {
      router.push(`/applications/${state.savedId}/edit`);
    }
  }, [state.ok, state.savedId, isEdit, router]);

  /* --------------------------- 封面（单选媒体） --------------------------- */
  const [cover, setCover] = React.useState<{
    mediaId: string;
    url: string;
    name: string;
    mime: string;
  } | null>(
    application?.coverMedia
      ? {
          mediaId: application.coverMediaId ?? '',
          url: application.coverMedia.url,
          name: application.coverMedia.originalName ?? '已选封面',
          mime: application.coverMedia.mimeType,
        }
      : null,
  );
  const [coverPickerOpen, setCoverPickerOpen] = React.useState(false);

  function handleCoverSelected(asset: MediaAsset) {
    setCover({ mediaId: asset.id, url: asset.url, name: asset.originalName, mime: asset.mimeType });
  }

  /* --------------------------- 关联产品（多选） --------------------------- */
  const [products, setProducts] = React.useState<PickedProduct[]>(
    (application?.products ?? []).map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
  );
  const [productPickerOpen, setProductPickerOpen] = React.useState(false);
  const selectedIds = React.useMemo(() => products.map((p) => p.id), [products]);

  function handleProductSelected(product: SelectedProduct) {
    setProducts((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setProducts((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

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

      {/* 隐藏字段：提交时一并发送 */}
      <input type="hidden" name="coverMediaId" value={cover?.mediaId ?? ''} />
      <input
        type="hidden"
        name="productIdsJson"
        value={JSON.stringify(products.map((p) => p.id))}
      />

      {/* ---------------------------- 基本信息 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" required>
              场景名称
            </Label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={200}
              defaultValue={application?.name ?? ''}
              placeholder="如：家具制造"
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
              defaultValue={application?.slug ?? ''}
              placeholder="furniture-manufacturing"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="summary">场景摘要</Label>
            <textarea
              id="summary"
              name="summary"
              rows={2}
              maxLength={500}
              defaultValue={application?.summary ?? ''}
              placeholder="一句话说明该场景（用于列表与卡片展示）"
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">详细说明</Label>
            <textarea
              id="description"
              name="description"
              rows={5}
              maxLength={20000}
              defaultValue={application?.description ?? ''}
              placeholder="该应用场景的行业背景、产品选型建议等（纯文本展示）"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 封面 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>封面图</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {cover ? (
            <div className="flex flex-wrap items-center gap-4 rounded-md border border-border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt="封面预览"
                className="h-16 w-24 rounded-sm border border-border object-cover"
              />
              <div className="flex flex-col gap-1">
                <span className="text-small text-foreground">{cover.name}</span>
                <span className="text-caption text-text-muted">{mediaTypeLabel(cover.mime)}</span>
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCoverPickerOpen(true)}
                >
                  更换
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setCover(null)}
                >
                  解除关联
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCoverPickerOpen(true)}
            >
              从媒体库选择封面
            </Button>
          )}
          <p className="text-caption text-text-muted">
            从媒体库选择，不在此处上传。解除关联不会删除媒体库中的文件。
          </p>
        </CardContent>
      </Card>

      {/* ---------------------------- 关联产品 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>关联产品</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {products.length === 0 ? (
            <p className="text-small text-text-secondary">
              尚未关联产品。该场景可用于展示行业方案，也可以关联具体产品型号。
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {products.map((product, index) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-4 py-2.5"
                >
                  <span className="flex flex-1 flex-col">
                    <span className="text-small font-medium text-foreground">{product.name}</span>
                    <span className="text-caption text-text-muted">{product.slug}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`上移 ${product.name}`}
                      disabled={index === 0}
                      onClick={() => moveProduct(index, -1)}
                    >
                      上移
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`下移 ${product.name}`}
                      disabled={index === products.length - 1}
                      onClick={() => moveProduct(index, 1)}
                    >
                      下移
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeProduct(product.id)}
                    >
                      移除
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProductPickerOpen(true)}
            >
              添加关联产品
            </Button>
          </div>
          <p className="text-caption text-text-muted">
            关联关系独立于产品本身：删除本场景不会删除任何产品。列表中仅「已发布」产品会出现在公开站。
          </p>
        </CardContent>
      </Card>

      {/* ---------------------------- 发布设置 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>发布设置</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">发布状态</Label>
            <select
              id="status"
              name="status"
              defaultValue={application?.status ?? 'DRAFT'}
              className={inputClass}
            >
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CONTENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <span className="text-caption text-text-muted">
              仅「已发布」场景会出现在公开站。
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sortOrder">排序（数字越小越靠前）</Label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={application?.sortOrder ?? 0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="publishedAt">发布时间</Label>
            <input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(application?.publishedAt)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              defaultChecked={application?.featured ?? false}
              className="size-4 rounded-sm border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Label htmlFor="featured">设为推荐场景（首页优先展示）</Label>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- SEO ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="seoTitle">SEO 标题</Label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={200}
              defaultValue={application?.seoTitle ?? ''}
              placeholder="留空则使用场景名称"
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
              defaultValue={application?.seoDescription ?? ''}
              placeholder="留空则使用场景摘要"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : isEdit ? '保存修改' : '创建场景'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          取消
        </Button>
      </div>

      <ApplicationCoverPicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        onSelect={handleCoverSelected}
      />
      <ProductPickerModal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        onSelect={handleProductSelected}
        selectedIds={selectedIds}
      />
    </form>
  );
}
