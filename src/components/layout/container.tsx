import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Container —— 统一内容容器
 *
 * 水平内边距（Mobile First）：
 *   手机 16px → 平板 24px → 桌面 32px
 * 宽度：narrow 768px（正文）/ page 1280px（默认）/ wide 1440px（大屏展示）
 */
const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    width: {
      narrow: 'max-w-narrow',
      page: 'max-w-page',
      wide: 'max-w-wide',
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    width: 'page',
  },
});

export interface ContainerProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof containerVariants> {
  as?: 'div' | 'section' | 'header' | 'footer' | 'nav';
}

function Container({ className, width = 'page', as: Comp = 'div', ...props }: ContainerProps) {
  return <Comp data-slot="container" className={cn(containerVariants({ width }), className)} {...props} />;
}

export { Container, containerVariants };
