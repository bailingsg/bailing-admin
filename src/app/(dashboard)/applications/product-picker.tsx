'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Overlay } from '@/components/ui/overlay';
import { searchProductsForApplication } from './actions';

/**
 * 关联产品选择弹窗。
 *
 * 通过后端产品列表搜索，选中后以 productId 建立显式多对多关联
 * （不使用产品名称字符串匹配）。已选中的产品会以禁用态展示。
 */

export interface SelectedProduct {
  id: string;
  name: string;
  slug: string;
}

interface ProductPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: SelectedProduct) => void;
  /** 已选中的产品 ID（用于置灰） */
  selectedIds: string[];
}

export function ProductPickerModal({
  open,
  onClose,
  onSelect,
  selectedIds,
}: ProductPickerModalProps) {
  const [items, setItems] = React.useState<SelectedProduct[]>([]);
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
    const result = await searchProductsForApplication(targetPage, kw);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? '加载产品列表失败');
      setItems([]);
      return;
    }
    setItems(result.items.map((item) => ({ id: item.id, name: item.name, slug: item.slug })));
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
      label="选择关联产品"
      panelClassName="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-body font-semibold text-foreground">选择关联产品</h2>
            <p className="text-caption text-text-muted">共 {total} 个产品</p>
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
            placeholder="按产品名称搜索"
            aria-label="搜索产品"
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
              {keyword ? '没有匹配的产品' : '还没有产品，请先到「产品管理」创建。'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((product) => {
                const picked = selectedIds.includes(product.id);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={picked}
                      onClick={() => {
                        onSelect(product);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-left outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex flex-col">
                        <span className="text-small font-medium text-foreground">{product.name}</span>
                        <span className="text-caption text-text-muted">{product.slug}</span>
                      </span>
                      <span className="text-caption text-text-secondary">
                        {picked ? '已关联' : '选择'}
                      </span>
                    </button>
                  </li>
                );
              })}
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
