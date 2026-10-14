import * as React from 'react';
import { cn } from '@/lib/utils';
import { fieldBaseClasses } from '@/components/ui/field-base';

/**
 * Select —— 原生 select 的设计系统封装
 * 保留原生可访问性与移动端体验，仅统一视觉；选项通过 children 传入 <option>。
 */
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        className={cn(
          fieldBaseClasses,
          'h-10 appearance-none pr-9 pl-3',
          '[&:has(option[value=""]:checked)]:text-text-muted',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {/* 下拉指示箭头（内联 SVG，避免引入图标依赖） */}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-muted"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export { Select };
