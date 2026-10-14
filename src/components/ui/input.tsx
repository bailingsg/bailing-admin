import * as React from 'react';
import { cn } from '@/lib/utils';
import { fieldBaseClasses } from '@/components/ui/field-base';

/** Input —— 单行文本输入（RFQ / Contact 表单基础控件） */
function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldBaseClasses, 'h-10 px-3', className)}
      {...props}
    />
  );
}

export { Input };
