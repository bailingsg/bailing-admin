import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

/**
 * Badge —— 后台状态标签（与主站同源，变体按管理场景裁剪）
 *
 * 主要用于记录状态展示：已发布 / 草稿 / 归档、新询盘 / 跟进中 / 已报价 等。
 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden',
    'rounded-full border border-transparent px-2.5 py-0.5 text-caption font-medium whitespace-nowrap',
    'transition-[color,background-color,border-color] duration-[var(--duration-fast)]',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border-strong text-foreground',
        muted: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        /** 成功 / 已发布 / 已完成 */
        success: 'bg-success-50 text-success-600',
        /** 警告 / 待处理 */
        warning: 'bg-warning-50 text-warning-600',
        /** 信息 / 进行中 */
        info: 'bg-info-50 text-info-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant = 'default', asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
