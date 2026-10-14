'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/format';
import type { CmsProductImage } from '@/lib/products';
import { deleteProductImageAction, uploadProductImageAction, type ProductFormState } from '../../actions';

/**
 * 产品图片管理（编辑页侧栏）。
 *
 * 上传经服务端 Action 转发 multipart 到后端（JWT 不出服务端）；
 * 后端完成魔数校验、主图唯一化与文件命名。
 */

const UPLOAD_INITIAL_STATE: ProductFormState = { ok: false };

export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: CmsProductImage[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState(
    uploadProductImageAction.bind(null, productId),
    UPLOAD_INITIAL_STATE,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 上传 */}
      <Card>
        <CardHeader>
          <CardTitle>上传图片</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file">图片文件</Label>
              <input
                id="file"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-small text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-small file:font-medium file:text-secondary-foreground"
              />
              <p className="text-caption text-text-muted">
                支持 JPEG / PNG / WebP / AVIF，单张不超过 5MB；首图自动设为主图。
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alt">替代文本（alt）</Label>
              <input
                id="alt"
                name="alt"
                maxLength={300}
                placeholder="图片描述，利于 SEO 与可访问性"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isPrimary"
                name="isPrimary"
                type="checkbox"
                className="size-4 rounded border-border accent-[var(--color-primary)]"
              />
              <Label htmlFor="isPrimary">设为主图（列表卡片 / OG 图）</Label>
            </div>

            {state.error ? (
              <p role="alert" className="text-small text-destructive">
                {state.error}
              </p>
            ) : null}
            {state.ok ? (
              <p role="status" className="text-small text-success-600">
                上传成功
              </p>
            ) : null}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? '上传中…' : '上传'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 已有图片 */}
      <Card>
        <CardHeader>
          <CardTitle>全部图片（{images.length}）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {images.length === 0 ? (
            <p className="py-4 text-center text-small text-text-secondary">还没有图片，先上传一张吧。</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {images.map((image) => (
                <li key={image.id}>
                  <ImageRow productId={productId} image={image} onDeleted={() => router.refresh()} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImageRow({
  productId,
  image,
  onDeleted,
}: {
  productId: string;
  image: CmsProductImage;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductImageAction(productId, image.id);
      if (!result.ok) {
        setError(result.error ?? '删除失败');
        setConfirming(false);
        return;
      }
      onDeleted();
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-2.5">
      {/* 本地静态资源（同源 /uploads/products/**），后台界面无需 next/image 优化 */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 动态上传的图片 URL，后台管理场景 */}
      <img
        src={image.url}
        alt={image.altText ?? '产品图片'}
        className="size-16 shrink-0 rounded-md border border-border object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {image.isPrimary ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-caption font-medium text-primary-foreground">
              主图
            </span>
          ) : null}
          <span className="text-caption text-text-muted">排序 {image.sortOrder}</span>
        </div>
        <span className="truncate text-small text-text-secondary">
          {image.altText ?? '（无替代文本）'}
        </span>
        <span className="text-caption text-text-muted">{formatDateTime(image.createdAt)}</span>
        {error ? (
          <span role="alert" className="text-caption text-destructive">
            {error}
          </span>
        ) : null}
      </div>
      {confirming ? (
        <span className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
            {pending ? '…' : '确认'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            取消
          </Button>
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          className="shrink-0 text-destructive hover:bg-destructive/10"
        >
          删除
        </Button>
      )}
    </div>
  );
}
