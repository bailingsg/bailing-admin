'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Overlay —— 后台唯一的遮罩基元（2026-10-26 重构）。
 *
 * 重构前的问题：
 *   后台共有 7 处各自手写的全屏遮罩（modal.tsx + 5 个选择器 + 媒体库预览），
 *   每处都重复一遍 `fixed inset-0 z-50 bg-black/50` 与 Esc 监听。带来三个问题：
 *     1. 遮罩逻辑分散，出问题要逐处排查；
 *     2. 没有统一标识 —— 页面上一旦出现「不明全屏压暗层」，无法判断是本项目的
 *        还是浏览器扩展注入的（2026-10-22、10-26 两次线上排查都卡在这里）；
 *     3. Esc 监听重复注册，部分弹窗关不掉。
 *
 * 现在的约定：
 *   · 关闭时**不渲染任何 DOM**，不存在常驻遮罩；
 *   · 所有遮罩都带 `data-bailing-overlay` 标记，外部注入层可据此被准确区分；
 *   · Esc 关闭、点击遮罩关闭、打开时锁定背景滚动、焦点移入面板并在关闭后归还；
 *   · 遮罩只在 `open` 时存在，且不拦截 Esc 的冒泡（避免与上层弹窗互相关闭）。
 */
export const OVERLAY_MARKER = 'data-bailing-overlay';

export interface OverlayProps {
  /** 是否打开。关闭时本组件不渲染任何节点 */
  open: boolean;
  /** 关闭回调（Esc / 点击遮罩触发） */
  onClose: () => void;
  /** 无障碍标签，作为 role=dialog 的 aria-label */
  label: string;
  /** 面板内容 */
  children: React.ReactNode;
  /** 面板类名（尺寸、圆角、背景、阴影等由调用方决定） */
  panelClassName?: string;
  /** 遮罩层类名（默认 bg-black/50，图片预览等场景可用更深的 bg-black/70） */
  backdropClassName?: string;
  /** 垂直对齐：center 居中，top 顶部对齐（长表单用） */
  align?: 'center' | 'top';
  /** 点击遮罩是否关闭，默认 true */
  closeOnBackdrop?: boolean;
}

export function Overlay({
  open,
  onClose,
  label,
  children,
  panelClassName,
  backdropClassName,
  align = 'center',
  closeOnBackdrop = true,
}: OverlayProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      // 不阻止默认行为（避免影响浏览器原生 Esc 语义），只冒泡给本层处理
      onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 焦点移入面板，方便键盘直接操作
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? panel).focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      // 焦点归还触发元素
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-bailing-overlay=""
      className={cn(
        'fixed inset-0 z-50 flex justify-center overflow-y-auto p-4',
        backdropClassName ?? 'bg-black/50',
        align === 'center' ? 'items-center' : 'items-start py-8',
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn('w-full outline-none', panelClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
