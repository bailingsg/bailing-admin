'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 顶部气泡提示（原「右下角成功提示」升级版）。
 *
 * 背景：后台的长表单（产品 / 文章 / 工厂 / 质量 / 应用场景）保存按钮在
 * 页面最底部，而原来的成功/失败提示是表单顶部的内联色块 —— 用户点完
 * 保存后视口里既看不到按钮的反馈、也看不到顶部的提示，只能怀疑没生效。
 *
 * 因此统一改为 **顶部居中悬浮气泡**：
 *   - 悬浮在顶栏下方，与滚动位置无关，任何滚动高度都能看到；
 *   - 成功 3s / 普通 4s / 失败 6s 自动消失（失败文案通常更长，读得慢）；
 *   - 失败用 role="alert"（读屏立即播报），其余 role="status"；
 *   - 底部进度条直观表达「还剩多久消失」，避免用户以为要手动关。
 *
 * 为什么用「模块级 store + 全局宿主」而不是组件内 state：
 *   删除成功后列表会 router.refresh()，被删的那一行连同它的客户端组件
 *   一起卸载 —— 若提示状态挂在该组件上，提示会在卸载瞬间消失。
 *   表单提交后 router.push() 换页同理。因此状态放在模块级 store，
 *   由布局里常驻的 <ToastHost /> 渲染。
 *
 * 刻意不引入第三方 toast 依赖：后台只需要这一种形态。
 */

export type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  /** 自动消失时间（毫秒） */
  duration: number;
};

let seq = 0;
let current: ToastItem | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function push(message: string, variant: ToastVariant, duration: number) {
  seq += 1;
  current = { id: seq, message, variant, duration };
  emit();
}

/** 成功提示（默认 3 秒）。保留旧签名，历史调用无需改动。 */
export function showToast(message: string): void {
  push(message, 'success', 3000);
}

/** 显式成功提示，语义与 showToast 相同 */
export function showSuccessToast(message: string): void {
  push(message, 'success', 3000);
}

/** 失败提示（默认 6 秒，读屏会立即播报） */
export function showErrorToast(message: string): void {
  push(message, 'error', 6000);
}

/** 中性提示（默认 4 秒） */
export function showInfoToast(message: string): void {
  push(message, 'info', 4000);
}

/** 手动关闭当前提示 */
export function dismissToast(): void {
  if (!current) return;
  current = null;
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

const TONE: Record<
  ToastVariant,
  { border: string; icon: string; bar: string; glyph: string }
> = {
  success: {
    border: 'border-success-600/25',
    icon: 'bg-success-50 text-success-600',
    bar: 'bg-success-600/40',
    glyph: '✓',
  },
  error: {
    border: 'border-danger-600/30',
    icon: 'bg-danger-50 text-danger-600',
    bar: 'bg-danger-600/40',
    glyph: '!',
  },
  info: {
    border: 'border-info-600/25',
    icon: 'bg-info-50 text-info-600',
    bar: 'bg-info-600/40',
    glyph: 'i',
  },
};

/**
 * 全局提示宿主：挂在后台布局上（不会因列表刷新或换页而卸载）。
 * 需要提示直接调用 showToast / showErrorToast 等。
 */
export function ToastHost() {
  const item = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [leaving, setLeaving] = React.useState(false);

  // 新提示进来时复位退出态（id 递增，必定变化）
  const itemId = item?.id ?? null;
  React.useEffect(() => {
    setLeaving(false);
  }, [itemId]);

  const close = React.useCallback((id: number) => {
    setLeaving(true);
    // 等退场动画走完再清空；期间若已有新提示则不动它
    window.setTimeout(() => {
      if (current?.id === id) {
        current = null;
        emit();
      }
    }, 140);
  }, []);

  React.useEffect(() => {
    if (!item) return;
    const timer = window.setTimeout(() => close(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item, close]);

  return (
    // 容器常驻：仅作为定位锚点，不参与点击（气泡自身恢复可交互）
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-[80] flex justify-center px-4"
    >
      {item ? (
        <div
          key={item.id}
          role={item.variant === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto relative flex w-fit max-w-[min(30rem,100%)] items-start gap-2.5',
            'overflow-hidden rounded-xl border bg-surface-elevated py-2.5 pl-3 pr-2 shadow-lg',
            TONE[item.variant].border,
            leaving
              ? 'animate-out fade-out slide-out-to-top-1 duration-150'
              : 'animate-in fade-in slide-in-from-top-2 duration-200',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-caption font-bold',
              TONE[item.variant].icon,
            )}
          >
            {TONE[item.variant].glyph}
          </span>

          <p className="min-w-0 flex-1 break-words py-px text-small text-foreground">{item.message}</p>

          <button
            type="button"
            onClick={() => close(item.id)}
            aria-label="关闭提示"
            className="ml-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            ×
          </button>

          {/* 剩余时间进度条 */}
          <span
            aria-hidden="true"
            className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-left', TONE[item.variant].bar)}
            style={{ animation: `toast-progress ${item.duration}ms linear forwards` }}
          />
        </div>
      ) : null}
    </div>
  );
}
