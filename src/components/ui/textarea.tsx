import * as React from 'react';
import { cn } from '@/lib/utils';
import { fieldBaseClasses } from '@/components/ui/field-base';

/** Textarea —— 多行文本输入（询盘需求描述等场景） */
function Textarea({ className, rows = 5, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows}
      data-slot="textarea"
      className={cn(fieldBaseClasses, 'resize-y px-3 py-2 leading-relaxed', className)}
      {...props}
    />
  );
}

export { Textarea };
