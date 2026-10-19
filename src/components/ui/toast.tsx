'use client';

import * as React from 'react';

/**
 * 轻量成功提示（Phase 5.3.2）。
 *
 * 用于「操作完成但停留在当前页」的场景（新增库存后留在列表、
 * 删除库存后留在列表、订单保存后返回详情）：不跳转、不打断，
 * 右下角浮层 4 秒自动消失，同时以 role="status" 供读屏播报。
 *
 * 为什么用「全局宿主 + 事件」而不是组件内 state：
 *   删除成功后列表会 router.refresh()，被删的那一行连同它的客户端组件
 *   一起卸载 —— 若 toast 状态挂在该组件上，提示会在卸载瞬间消失。
 *   因此状态放在模块级 store，由布局里常驻的 <ToastHost /> 渲染。
 *
 * 刻意不引入第三方 toast 依赖：后台只需要这一种形态。
 */

type ToastItem = { id: number; message: string };

let seq = 0;
let current: ToastItem | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** 显示一条成功提示（覆盖上一条） */
export function showToast(message: string): void {
  seq += 1;
  current = { id: seq, message };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastItem | null {
  return current;
}

function getServerSnapshot(): ToastItem | null {
  return null;
}

/**
 * 全局提示宿主：挂在后台布局上（不会因列表刷新而卸载）。
 * 需要新的提示直接调用 showToast('...')。
 */
export function ToastHost() {
  const item = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => {
      // 只关闭当前这一条，避免误关后续新提示
      if (current?.id === item.id) {
        current = null;
        emit();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [item]);

  if (!item) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-success-600/30 bg-surface px-4 py-3 shadow-lg"
    >
      <span aria-hidden className="mt-0.5 text-success-600">
        ✓
      </span>
      <p className="text-small text-foreground">{item.message}</p>
      <button
        type="button"
        onClick={() => {
          current = null;
          emit();
        }}
        aria-label="关闭提示"
        className="ml-1 text-text-muted transition-colors hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}
