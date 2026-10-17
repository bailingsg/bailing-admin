'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { orderPhotoUrl, type OrderAttachment } from '@/lib/orders';

/**
 * 订单照片多图上传组件（Phase 5.2）。
 *
 * 要点：
 *   · 逐张走 XHR 上传到 /api/order-photos/upload（服务端附加 JWT 转发后端），
 *     因此可以展示每张的真实上传进度；上传是「临时态」，保存订单时才关联。
 *   · 客户端只做格式/体积预检，真正的校验（魔数、MIME、storageKey 白名单）
 *     全部在后端 OrderFileService。
 *   · 失败可单独重试，不影响其他照片；未保存的照片若被移除，后端按 24h
 *     定时清理孤立临时附件，不会残留。
 *   · previews 由本组件按附件 ID 维护本地对象 URL：persisted（有 orderId）的
 *     走 /api/order-photos 代理，未落库的用 createObjectURL 预览。
 */

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 与后端 MAX_ORDER_ATTACHMENT_SIZE 一致
const MAX_PHOTOS = 9;

type UploadStatus = 'uploading' | 'done' | 'error';

interface PendingItem {
  key: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  previewUrl: string;
  /** 上传成功后回填的附件 ID（done 状态必填） */
  attachmentId?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function PhotoUploader({
  value,
  onChange,
  orderId,
  maxFiles = MAX_PHOTOS,
}: {
  value: OrderAttachment[];
  onChange: (items: OrderAttachment[]) => void;
  /** 已落库订单（编辑态）：已持久化附件走后端鉴权代理 */
  orderId?: string;
  maxFiles?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<PendingItem[]>([]);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // 组件卸载时统一释放对象 URL，避免内存泄漏
  React.useEffect(() => {
    const urls = Object.values(previews);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCount = value.length + items.filter((one) => one.status === 'uploading').length;
  const remaining = Math.max(0, maxFiles - totalCount);

  function appendAttachment(attachment: OrderAttachment) {
    onChange([...valueRef.current, attachment]);
  }

  function removeUploaded(attachmentId: string) {
    onChange(valueRef.current.filter((item) => item.id !== attachmentId));
    setPreviews((prev) => {
      const url = prev[attachmentId];
      if (url) URL.revokeObjectURL(url);
      const next = { ...prev };
      delete next[attachmentId];
      return next;
    });
  }

  function uploadItem(item: PendingItem) {
    setItems((prev) =>
      prev.map((one) =>
        one.key === item.key ? { ...one, status: 'uploading', progress: 0, error: undefined } : one,
      ),
    );

    const form = new FormData();
    form.append('file', item.file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/order-photos/upload');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setItems((prev) => prev.map((one) => (one.key === item.key ? { ...one, progress: percent } : one)));
    };
    xhr.onload = () => {
      let payload:
        | { ok?: boolean; data?: OrderAttachment; error?: { message?: string | string[] } }
        | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status === 401) {
        setItems((prev) =>
          prev.map((one) =>
            one.key === item.key ? { ...one, status: 'error', error: '登录已失效，请重新登录' } : one,
          ),
        );
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.ok && payload.data) {
        const attachment = payload.data;
        setItems((prev) =>
          prev.map((one) =>
            one.key === item.key
              ? {
                  ...one,
                  status: 'done',
                  progress: 100,
                  error: undefined,
                  name: attachment.originalName,
                  attachmentId: attachment.id,
                }
              : one,
          ),
        );
        // 本地预览 URL 延寿到「移除该附件」或「组件卸载」
        setPreviews((prev) => ({ ...prev, [attachment.id]: item.previewUrl }));
        appendAttachment(attachment);
        return;
      }

      const rawMessage = payload?.error?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join('；')
        : rawMessage || `上传失败（HTTP ${xhr.status}）`;
      setItems((prev) =>
        prev.map((one) => (one.key === item.key ? { ...one, status: 'error', error: message } : one)),
      );
    };
    xhr.onerror = () => {
      setItems((prev) =>
        prev.map((one) => (one.key === item.key ? { ...one, status: 'error', error: '网络错误，请重试' } : one)),
      );
    };
    xhr.send(form);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).slice(0, remaining);
    const next: PendingItem[] = [];
    const toUpload: PendingItem[] = [];
    for (const file of selected) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        next.push({
          key,
          file,
          name: file.name,
          size: file.size,
          status: 'error',
          progress: 0,
          error: '仅支持 JPG / PNG / WebP 格式',
          previewUrl: '',
        });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        next.push({
          key,
          file,
          name: file.name,
          size: file.size,
          status: 'error',
          progress: 0,
          error: '单张照片不能超过 10MB',
          previewUrl: '',
        });
        continue;
      }
      const item: PendingItem = {
        key,
        file,
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
        previewUrl: URL.createObjectURL(file),
      };
      next.push(item);
      toUpload.push(item);
    }
    if (inputRef.current) inputRef.current.value = '';
    setItems((prev) => [...prev, ...next]);
    for (const item of toUpload) uploadItem(item);
  }

  function removePending(key: string) {
    const target = items.find((one) => one.key === key);
    // 已成功的上传：同步从待关联列表移除（顺带释放本地预览）
    if (target?.status === 'done' && target.attachmentId) {
      removeUploaded(target.attachmentId);
      setItems((prev) => prev.filter((one) => one.key !== key));
      return;
    }
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    setItems((prev) => prev.filter((one) => one.key !== key));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="order-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={remaining === 0}
          onChange={(event) => handleFiles(event.target.files)}
          className="block w-full max-w-96 text-small text-text-secondary file:mr-3 file:h-9 file:rounded-md file:border file:border-border-strong file:bg-background file:px-3 file:text-small file:font-medium file:text-foreground hover:file:bg-accent"
        />
        <p className="text-caption text-text-muted">
          {remaining > 0
            ? `还可上传 ${remaining} 张；支持 JPG / PNG / WebP，单张不超过 10MB`
            : `已达上限（最多 ${maxFiles} 张）`}
        </p>
      </div>

      {/* 已上传照片（新建态待关联 / 编辑态含已落库） */}
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {value.map((attachment) => (
            <li
              key={attachment.id}
              className="group relative h-28 w-28 overflow-hidden rounded-md border border-border"
            >
              {orderId && !previews[attachment.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orderPhotoUrl(orderId, attachment.id)}
                  alt={attachment.originalName}
                  className="h-full w-full object-cover"
                />
              ) : previews[attachment.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[attachment.id]}
                  alt={attachment.originalName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-accent text-caption text-text-muted">
                  {attachment.originalName}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeUploaded(attachment.id)}
                className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-small text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`移除 ${attachment.originalName}`}
              >
                ×
              </button>
              <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 py-0.5 text-caption text-white">
                {attachment.originalName}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* 上传中 / 失败（可重试） */}
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center"
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-16 w-16 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-accent text-caption text-text-muted">
                  文件
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-small font-medium text-foreground">{item.name}</span>
                  <span className="text-caption text-text-muted">{formatSize(item.size)}</span>
                  {item.status === 'uploading' ? (
                    <span className="text-caption text-text-secondary">上传中 {item.progress}%</span>
                  ) : null}
                  {item.status === 'done' ? (
                    <span className="text-caption font-medium text-success-600">已上传</span>
                  ) : null}
                  {item.status === 'error' ? (
                    <span className="text-caption font-medium text-destructive">{item.error}</span>
                  ) : null}
                </div>
                {item.status === 'uploading' ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.status === 'error' ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => uploadItem(item)}>
                    重试
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePending(item.key)}
                  aria-label={`移除 ${item.name}`}
                >
                  {item.status === 'done' ? '移除' : '取消'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
