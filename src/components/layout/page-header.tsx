import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader —— 后台页面标题区
 *
 * 后台版"SectionHeader"：标题 + 描述 + 右侧操作区，可选面包屑占位。
 * 不使用营销官网的大字标题与大幅留白，保持管理系统的紧凑信息密度。
 */
export interface PageHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** 页面标题 */
  title: React.ReactNode;
  /** 页面描述 */
  description?: React.ReactNode;
  /** 面包屑（可选，Phase 3.3 接入路由后填充） */
  breadcrumb?: React.ReactNode;
  /** 右侧操作区（如"新建"按钮） */
  actions?: React.ReactNode;
}

export function PageHeader({
  className,
  title,
  description,
  breadcrumb,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-4 border-b border-header-border bg-header px-4 py-5 sm:px-6 sm:py-6',
        'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {breadcrumb ? (
          <div className="text-caption text-text-muted">{breadcrumb}</div>
        ) : null}
        <h1 className="text-heading-md text-foreground">{title}</h1>
        {description ? (
          <p className="text-small text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
