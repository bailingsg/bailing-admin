'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Overlay } from '@/components/ui/overlay';
import { mediaTypeLabel, type MediaAsset } from '@/lib/media';
import { fetchMediaForFactory } from './actions';

/**
 * 媒体库选择弹窗（封面 / 图库 / 证书文件共用）。
 *
 * 企业内容模块不自行上传文件：本弹窗只读浏览 Phase 4.3 媒体库（/cms/media），
 * 选定后把资产交给调用方。上传请到「媒体资源」页面完成。
 *
 * @param category 传 'DOCUMENT' 只看 PDF，'IMAGE' 只看图片，不传则全部
 */

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  /** 限定媒体类别（质量模块选 PDF 时传 'DOCUMENT'） */
  category?: 'IMAGE' | 'DOCUMENT';
  title?: string;
}

function isDoc(asset: MediaAsset): boolean {
  return asset.mimeType === 'application/pdf';
}

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  category,
  title = '从媒体库选择',
}: MediaPickerModalProps) {
  const [items, setItems] = React.useState<MediaAsset[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [keyword, setKeyword] = React.useState('');
  const [draftKeyword, setDraftKeyword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (targetPage: number, kw: string) => {
      setLoading(true);
      setError(null);
      const result = await fetchMediaForFactory(targetPage, kw, category);
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
    [category],
  );

  React.useEffect(() => {
    if (!open) return;
    void load(1, '');
    setKeyword('');
    setDraftKeyword('');
  }, [open, load]);

  if (!open) return null;

  const emptyHint =
    category === 'DOCUMENT'
      ? '媒体库没有 PDF 文档，请先到「媒体资源」页面上传证书 / 报告。'
      : '媒体库还是空的，请先到「媒体资源」页面上传图片。';

  return (
    <Overlay
      open
      onClose={onClose}
      label={title}
      panelClassName="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-body font-semibold text-foreground">{title}</h2>
            <p className="text-caption text-text-muted">
              共 {total} 个资源 · 需要新文件请先到「媒体资源」页面上传
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>

        <form
          className="flex items-end gap-3 border-b border-border px-5 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            setKeyword(draftKeyword.trim());
            void load(1, draftKeyword.trim());
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
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            搜索
          </Button>
        </form>

        <div className="min-h-40 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-10 text-center text-small text-text-secondary">加载中…</p>
          ) : error ? (
            <p role="alert" className="py-10 text-center text-small text-destructive">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-small text-text-secondary">
              {keyword ? '没有匹配的媒体资源' : emptyHint}
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
                    {isDoc(asset) ? (
                      <span className="flex h-24 w-full items-center justify-center rounded-sm bg-muted text-caption font-medium text-text-secondary">
                        {mediaTypeLabel(asset.mimeType)}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
                      <img
                        src={asset.url}
                        alt={asset.altText ?? asset.originalName}
                        className="h-24 w-full rounded-sm bg-muted object-cover"
                        loading="lazy"
                      />
                    )}
                    <span className="truncate text-caption text-text-secondary" title={asset.originalName}>
                      {asset.originalName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
                onClick={() => void load(page - 1, keyword)}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => void load(page + 1, keyword)}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
    </Overlay>
  );
}
