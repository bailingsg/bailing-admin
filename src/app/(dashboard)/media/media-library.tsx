'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import {
  formatFileSize,
  friendlyDeleteError,
  MEDIA_MAX_SIZE_MB,
  MEDIA_USAGES,
  mediaTypeLabel,
  mediaUsageLabel,
  type MediaAsset,
  type MediaUsage,
} from '@/lib/media';
import {
  deleteMediaAction,
  updateMediaUsageAction,
  uploadMediaAction,
  type MediaFormState,
} from './actions';

/**
 * 媒体资源库（Phase 4.3）。
 *
 * 上传经服务端 Action 转发 multipart 到后端（JWT 不出服务端）；
 * 后端完成 MIME/魔数/大小校验、UUID 文件名与引用检查。
 * 删除为页内两步确认（避免误删被产品引用的媒体）。
 *
 * Phase 5.6：新增「用途分类」（文章 / 产品 / 证书 / 工厂 / 生产 / 装车 …），
 * 上传时选择、卡片上可随时改，用于媒体库筛选与业务选择器收敛。
 *
 * 引用状态：后端返回 referenceCount（与删除保护同源规则），0 = 未被引用，
 * 卡片打「未被引用」标签；配合页面「未被引用」筛选清理僵尸图片。
 */

const UPLOAD_INITIAL_STATE: MediaFormState = { ok: false };

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <UploadZone />
      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无媒体</p>
            <p className="mt-1 text-small text-text-secondary">
              拖拽图片到上方区域，或点击选择文件上传（JPEG / PNG / WebP / AVIF）。
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id}>
              <MediaCard asset={asset} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- 上传区 ----------------------------- */

function UploadZone() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  // 用途分类：上传时一并提交，成功后保留选择（同批图片通常同用途）
  const [usage, setUsage] = React.useState<MediaUsage | ''>('');
  const [state, formAction, pending] = React.useActionState(
    uploadMediaAction,
    UPLOAD_INITIAL_STATE,
  );

  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function buildFormData(file: File): FormData | string {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `不支持的图片格式：${file.type || file.name}（仅支持 JPEG / PNG / WebP / AVIF）`;
    }
    if (file.size > MEDIA_MAX_SIZE_MB * 1024 * 1024) {
      return `文件超过大小限制（最大 ${MEDIA_MAX_SIZE_MB}MB）`;
    }
    const formData = new FormData();
    formData.append('file', file);
    // 空值不提交，后端按「未分类」处理
    if (usage) formData.append('usage', usage);
    return formData;
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const payload = buildFormData(file);
    if (typeof payload === 'string') {
      setLocalError(payload); // 客户端预校验失败：本地提示，不打扰后端
      return;
    }
    setLocalError(null);
    formAction(payload);
  }

  return (
    <Card>
      <CardContent className="py-5">
        {/* 用途分类：上传前先选，落库后可在卡片上修改 */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex min-w-52 flex-col gap-1.5">
            <label htmlFor="upload-usage" className="text-small font-medium text-foreground">
              图片用途
            </label>
            <select
              id="upload-usage"
              value={usage}
              onChange={(event) => setUsage(event.target.value as MediaUsage | '')}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">未分类</option>
              {MEDIA_USAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} · {item.hint}
                </option>
              ))}
            </select>
          </div>
          <p className="pb-1 text-caption text-text-muted">
            上传后自动归入该用途，可在图片卡片上随时修改
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="上传图片：点击选择文件，或拖拽图片到此处"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors duration-[var(--duration-fast)] ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/60 hover:bg-muted/40'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-8 text-text-muted">
            <path
              d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-small font-medium text-foreground">拖拽图片到此处上传</p>
          <p className="text-caption text-text-muted">
            或点击选择文件 · JPEG / PNG / WebP / AVIF · 单张不超过 {MEDIA_MAX_SIZE_MB}MB
          </p>
        </div>

        <form action={formAction} className="mt-3 flex items-center gap-3">
          <input
            ref={inputRef}
            id="media-file"
            name="file"
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const payload = buildFormData(file);
              if (typeof payload === 'string') {
                setLocalError(payload);
                return;
              }
              setLocalError(null);
              formAction(payload);
              event.target.value = '';
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            选择文件
          </Button>
          {pending ? <span className="text-small text-text-secondary">上传中…</span> : null}
        </form>

        {localError ? (
          <p role="alert" className="mt-2 text-small text-destructive">
            {localError}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="mt-2 text-small text-destructive">
            {state.status === 413
              ? `文件超过大小限制（最大 ${MEDIA_MAX_SIZE_MB}MB）`
              : friendlyDeleteError(state.error)}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="mt-2 text-small text-success-600">
            上传成功
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
/* ----------------------------- 媒体卡片 ----------------------------- */

function MediaCard({ asset }: { asset: MediaAsset }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [usagePending, startUsageTransition] = React.useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMediaAction(asset.id);
      if (!result.ok) {
        setError(friendlyDeleteError(result.error ?? '删除失败'));
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  function handleUsageChange(next: MediaUsage | '') {
    setError(null);
    startUsageTransition(async () => {
      const result = await updateMediaUsageAction(asset.id, next);
      if (!result.ok) {
        setError(result.error ?? '用途修改失败');
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden pt-0">
      {/* 缩略图（点击预览） */}
      <button
        type="button"
        onClick={() => setPreviewing(true)}
        aria-label={`预览 ${asset.originalName}`}
        className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted"
      >
        {/* 后端返回的本地静态资源 URL（同源 /uploads/media/**），后台界面无需 next/image 优化 */}
        {/* eslint-disable-next-line @next/next/no-img-element -- 动态上传的图片 URL，后台管理场景 */}
        <img
          src={asset.url}
          alt={asset.altText ?? asset.originalName}
          loading="lazy"
          className="size-full object-cover transition-transform duration-[var(--duration-fast)] group-hover:scale-105"
        />
        <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-caption text-white opacity-0 transition-opacity group-hover:opacity-100">
          点击预览
        </span>
      </button>

      <CardContent className="flex flex-col gap-2 py-3">
        <p className="truncate text-small font-medium text-foreground" title={asset.originalName}>
          {asset.originalName}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-text-muted">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            {mediaTypeLabel(asset.mimeType)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              asset.usage
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-text-muted'
            }`}
          >
            {mediaUsageLabel(asset.usage)}
          </span>
          {/* 引用状态：0 = 未被任何业务记录引用（可安全删除） */}
          {asset.referenceCount === 0 ? (
            <span
              className="rounded-full bg-warning-50 px-2 py-0.5 font-medium text-warning-600"
              title="未被任何业务记录引用，可安全删除"
            >
              未被引用
            </span>
          ) : null}
          <span>{formatFileSize(asset.size)}</span>
          {asset.width && asset.height ? (
            <span>
              {asset.width}×{asset.height}
            </span>
          ) : null}
        </div>
        <p className="text-caption text-text-muted">{formatDateTime(asset.createdAt)}</p>

        {/* 用途分类就地修改（无需进入详情，便于批量整理历史图片） */}
        <label className="flex items-center gap-2 text-caption text-text-muted">
          <span className="shrink-0">用途</span>
          <select
            value={asset.usage ?? ''}
            disabled={usagePending}
            onChange={(event) => handleUsageChange(event.target.value as MediaUsage | '')}
            aria-label={`修改 ${asset.originalName} 的用途分类`}
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-caption text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
          >
            <option value="">未分类</option>
            {MEDIA_USAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        ) : null}

        {confirming ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? '…' : '确认删除'}
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
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            className="w-fit text-destructive hover:bg-destructive/10"
          >
            删除
          </Button>
        )}
      </CardContent>

      {previewing ? <PreviewModal asset={asset} onClose={() => setPreviewing(false)} /> : null}
    </Card>
  );
}

/* ----------------------------- 预览弹窗 ----------------------------- */

function PreviewModal({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`预览 ${asset.originalName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="truncate text-small font-medium text-foreground" title={asset.originalName}>
            {asset.originalName}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- 预览动态媒体 URL */}
          <img
            src={asset.url}
            alt={asset.altText ?? asset.originalName}
            className="max-h-[60vh] max-w-full object-contain"
          />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-4 py-3 text-small sm:grid-cols-4">
          <Meta label="类型" value={mediaTypeLabel(asset.mimeType)} />
          <Meta label="用途" value={mediaUsageLabel(asset.usage)} />
          <Meta
            label="引用"
            value={
              asset.referenceCount > 0
                ? `被 ${asset.referenceCount} 处业务记录引用`
                : '未被引用'
            }
          />
          <Meta label="大小" value={formatFileSize(asset.size)} />
          <Meta
            label="尺寸"
            value={asset.width && asset.height ? `${asset.width}×${asset.height}` : '—'}
          />
          <Meta label="上传时间" value={formatDateTime(asset.createdAt)} />
          <Meta label="存储键" value={asset.storageKey} mono />
          <Meta label="提供方" value={asset.provider === 'LOCAL' ? '本地存储' : '腾讯云 COS'} />
        </dl>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className={`truncate text-foreground ${mono ? 'font-mono text-caption' : ''}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
