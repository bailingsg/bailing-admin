import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Label —— 表单标签
 * 支持必填标记与错误态联动（通过 htmlFor 关联控件）。
 */
export interface LabelProps extends React.ComponentProps<'label'> {
  /** 是否必填（展示 * 标记，仅视觉提示，校验逻辑由表单层负责） */
  required?: boolean;
}

function Label({ className, required = false, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-1 text-small font-medium text-foreground',
        'peer-disabled:cursor-not-allowed peer-disabled:text-disabled-foreground',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
}

export { Label };
