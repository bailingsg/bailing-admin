'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Overlay } from '@/components/ui/overlay';
import { MEDIA_USAGES, mediaUsageLabel, type MediaAsset, type MediaUsage } from '@/lib/media';
import { fetchMediaForPicker, uploadMediaWithUsageAction } from './actions';

/**
 * 媒体库选择弹窗（封面 / 正文插图共用）。
 *
 * Phase 5.6：
 *   · 传入 uploadUsage 时提供「上传新图片」入口——上传即自动归类到该用途
 *     （文章 → 文章，产品 → 产品），无需再去媒体库手动选分类
 *   · **从库里选择已有图片属于「引用」，不改动该图片的用途分类**
 *   · 可按用途筛选（默认只看「文章」用途）
 */

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  /** 上传入口的自动归类用途；不传则不显示上传按钮（只读浏览媒体库） */
  uploadUsage?: MediaUsage;
}

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  uploadUsage,
}: MediaPickerModalProps) {
  const [items, setItems] = React.useState<MediaAsset[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [keyword, setKeyword] = React.useState('');
  const [draftKeyword, setDraftKeyword] = React.useState('');
  // Phase 5.6：按用途收敛（默认只看「文章」用途，可切「全部」）
  const [usage, setUsage] = React.useState<MediaUsage | ''>('BLOG');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Phase 5.6：直接上传新图片（自动归类为「文章」）
  const uploadRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadDone, setUploadDone] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (targetPage: number, kw: string, nextUsage: MediaUsage | '' = '') => {
      setLoading(true);
      setError(null);
      const result = await fetchMediaForPicker(
        targetPage,
        kw,
        nextUsage === '' ? undefined : nextUsage,
      );
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? '加载媒体库失败');
        setItems([]);
        return;
      }
      setItems(result.items);
      setTotal(result.total);
      setPage(targetPage);
      setTotalPages(Math.max(1, result.totalPages));
    },
    [],
  );

  React.useEffect(() => {
    if (!open) return;
    setKeyword('');
    setDraftKeyword('');
    setUsage('BLOG');
    setUploadError(null);
    setUploadDone(null);
    void load(1, '', 'BLOG');
  }, [open, load]);

  /** 上传并直接选中：新图片的用途按所在编辑器自动归类 */
  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadUsage) return;
    const file = event.target.files?.[0];
    // 重置 input，保证连续选同一个文件也能触发 change
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    setUploadDone(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadMediaWithUsageAction(uploadUsage, formData);
    setUploading(false);

    if (!result.ok || !result.asset) {
      setUploadError(result.error ?? '上传失败');
      return;
    }

    setUploadDone(result.asset.originalName);
    // 新图可能落在当前用途筛选之外：刷新一次列表（不自动切「全部」）
    void load(1, keyword, usage);
    onSelect(result.asset);
    onClose();
  }


  if (!open) return null;

  return (
    <Overlay
      open
      onClose={onClose}
      label="从媒体库选择图片"
      panelClassName="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
        {/* 头部 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-body font-semibold text-foreground">从媒体库选择图片</h2>
            <p className="text-caption text-text-muted">
              共 {total} 个资源 · 选择已有图片不会改动其用途分类
            </p>
          </div>
          <div className="flex items-center gap-2">
            {uploadUsage ? (
              <>
                <input
                  ref={uploadRef}
                  id="picker-upload-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(event) => void handleUpload(event)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => uploadRef.current?.click()}
                >
                  {uploading ? '上传中…' : '上传新图片'}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>

        {uploadError ? (
          <p
            role="alert"
            className="border-b border-border bg-destructive/10 px-5 py-2 text-small text-destructive"
          >
            {uploadError}
          </p>
        ) : null}
        {uploadDone ? (
          <p
            role="status"
            className="border-b border-border bg-success-50 px-5 py-2 text-small text-success-600"
          >
            已上传「{uploadDone}」并归类为「
            {MEDIA_USAGES.find((item) => item.value === uploadUsage)?.label ?? uploadUsage}
            」，已选中
          </p>
        ) : null}

        {/* 搜索 */}
        <form
          className="flex items-end gap-3 border-b border-border px-5 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            setKeyword(draftKeyword.trim());
            void load(1, draftKeyword.trim(), usage);
          }}
        >
          <input
            type="search"
            value={draftKeyword}
            onChange={(event) => setDraftKeyword(event.target.value)}
            placeholder="按文件名搜索"
            aria-label="搜索媒体"
            className="h-9 min-w-48 flex-1 rounded-md border border-border bg-background px-3 text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <select
            value={usage}
            aria-label="按用途筛选"
            onChange={(event) => {
              const next = event.target.value as MediaUsage | '';
              setUsage(next);
              void load(1, keyword, next);
            }}
            className="h-9 rounded-md border border-border bg-background px-2 text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部用途</option>
            {MEDIA_USAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            搜索
          </Button>
        </form>

        {/* 内容 */}
        <div className="min-h-40 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-10 text-center text-small text-text-secondary">加载中…</p>
          ) : error ? (
            <p role="alert" className="py-10 text-center text-small text-destructive">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-small text-text-secondary">
              {keyword || usage
                ? '当前筛选条件下没有媒体资源，可切到「全部用途」或清空关键词。'
                : '媒体库还是空的，请先到「媒体资源」页面上传图片。'}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(asset);
                      onClose();
                    }}
                    className="group flex w-full flex-col gap-2 rounded-md border border-border p-2 text-left outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {/* 后端返回的本地静态资源 URL */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化 */}
                    <img
                      src={asset.url}
                      alt={asset.altText ?? asset.originalName}
                      className="h-24 w-full rounded-sm bg-muted object-cover"
                      loading="lazy"
                    />
                    <span className="truncate text-caption text-text-secondary" title={asset.originalName}>
                      {asset.originalName}
                    </span>
                    <span className="w-fit rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      {mediaUsageLabel(asset.usage)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <span className="text-caption text-text-secondary">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || page <= 1}
                onClick={() => void load(page - 1, keyword, usage)}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => void load(page + 1, keyword, usage)}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
    </Overlay>
  );
}
