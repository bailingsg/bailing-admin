'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Overlay } from '@/components/ui/overlay';
import type { MediaAsset } from '@/lib/media';
import { fetchMediaForApplication } from './actions';

/** 应用场景封面选择弹窗（只读媒体库，不自行上传） */
export function ApplicationCoverPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const [items, setItems] = React.useState<MediaAsset[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [keyword, setKeyword] = React.useState('');
  const [draftKeyword, setDraftKeyword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (targetPage: number, kw: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchMediaForApplication(targetPage, kw);
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
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void load(1, '');
    setKeyword('');
    setDraftKeyword('');
  }, [open, load]);

  if (!open) return null;

  return (
    <Overlay
      open
      onClose={onClose}
      label="从媒体库选择封面"
      panelClassName="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-body font-semibold text-foreground">从媒体库选择封面</h2>
            <p className="text-caption text-text-muted">
              共 {total} 个资源 · 需要新图片请先到「媒体资源」页面上传
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
              {keyword ? '没有匹配的媒体资源' : '媒体库还是空的，请先到「媒体资源」页面上传图片。'}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.altText ?? asset.originalName}
                      className="h-24 w-full rounded-sm bg-muted object-cover"
                      loading="lazy"
                    />
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
