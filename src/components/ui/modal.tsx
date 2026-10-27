'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Overlay } from '@/components/ui/overlay';

/**
 * Modal —— 通用弹窗容器（Phase 4.6 新增，2026-10-26 收敛到 Overlay 基元）。
 *
 * 后台的「创建 / 查看 / 编辑」类交互统一走本组件，行为约定：
 *   · Esc 关闭；**点击遮罩不关闭**（长表单误点一次就丢全部输入，代价太大），
 *     关闭入口只有 Esc 与明确的按钮（右上角「关闭」/ footer 的「取消」）
 *   · 关闭 ≠ 提交（与「关闭弹窗 ≠ 关闭计划」同思路）
 *   · 打开时锁定背景滚动，关闭后恢复
 *   · 标题区右侧固定关闭按钮，footer 由调用方传入
 *
 * 不使用原生 alert/confirm：两步确认一律由调用方在 footer 渲染第二个按钮，
 * 避免误触与不可读的交互。
 *
 * 实现说明：遮罩本身由 `components/ui/overlay.tsx` 统一提供，
 * 本文件只负责「标题区 + 内容区 + footer」的排版结构。
 * 遮罩基元负责渲染、Esc 关闭、滚动锁定与焦点管理。
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 内容区最大宽度（默认 640px，矩阵类宽内容可传 960px） */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const MAX_WIDTH_CLASS: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      label={title}
      align="top"
      // 显式关闭「点遮罩关闭」：长表单里误点面板外会丢掉全部输入
      closeOnBackdrop={false}
      panelClassName={cn(
        'flex flex-col rounded-lg border border-border bg-background shadow-lg',
        MAX_WIDTH_CLASS[maxWidth],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-body font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-caption text-text-muted">{description}</p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
          {footer}
        </div>
      ) : null}
    </Overlay>
  );
}

/** 表单字段容器：label + 控件 + 帮助/错误文本，统一节奏 */
export function FormField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-small font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** 进度条（宽度由调用方给出百分比，绝不本地推算业务含义） */
export function ProgressBar({
  percent,
  label,
  tone = 'primary',
}: {
  percent: number;
  label?: string;
  tone?: 'primary' | 'success' | 'muted';
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '进度'}
      >
        <div
          className={cn(
            'h-full rounded-full',
            tone === 'success' ? 'bg-success-600' : tone === 'muted' ? 'bg-text-muted' : 'bg-primary',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-caption text-text-secondary">
        {clamped}%
      </span>
    </div>
  );
}
