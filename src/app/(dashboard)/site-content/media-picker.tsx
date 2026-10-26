'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { fetchMediaForSection } from './actions';
import { withBasePath } from '@/lib/base-path';

/**
 * 站点分区配图选择弹窗（只读媒体库，不自行上传）。
 * 选中后把媒体 ID 写入隐藏字段 mediaId，供表单提交。
 */
export function SectionMediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: { id: string; url: string; altText: string | null }) => void;
}) {
  const [items, setItems] = React.useState<{ id: string; url: string; altText: string | null; originalName: string }[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [draftKeyword, setDraftKeyword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (targetPage: number, keyword: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchMediaForSection(targetPage, keyword);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? '加载媒体库失败');
      setItems([]);
      return;
    }
    setItems(result.items.map((item) => ({
      id: item.id,
      url: item.url,
      altText: item.altText,
      originalName: item.originalName,
    })));
    setPage(targetPage);
    setTotalPages(Math.max(1, result.totalPages));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void load(1, '');
  }, [open, load]);

  // 注意：Esc / 点击遮罩关闭已由 Modal 底层的 Overlay 基元统一处理，
  // 本组件无需再单独注册 keydown 监听。

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="从媒体库选择配图" maxWidth="xl">
      <div className="flex flex-col gap-4">
        <form
          className="flex items-end gap-2"
          action={withBasePath('/site-content')}
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            void load(1, draftKeyword);
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="media-keyword" className="text-small font-medium text-foreground">
              搜索素材
            </label>
            <input
              id="media-keyword"
              type="search"
              value={draftKeyword}
              onChange={(event) => setDraftKeyword(event.target.value)}
              placeholder="文件名 / 替代文本"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <Button type="submit" variant="outline" size="default">
            搜索
          </Button>
        </form>

        {loading ? (
          <p className="py-8 text-center text-small text-text-secondary">加载中…</p>
        ) : error ? (
          <p role="alert" className="py-4 text-small text-destructive">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-small text-text-secondary">
            媒体库暂无图片素材。请先到「媒体资源」上传。
          </p>
        ) : (
          <ul className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="flex w-full flex-col gap-2 rounded-md border border-border p-2 text-left transition-colors hover:border-primary hover:bg-table-row-hover"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.altText ?? item.originalName}
                    className="h-28 w-full rounded-sm object-cover"
                    loading="lazy"
                  />
                  <span className="truncate text-caption text-text-muted" title={item.originalName}>
                    {item.originalName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-small text-text-secondary">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1, draftKeyword)}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1, draftKeyword)}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
