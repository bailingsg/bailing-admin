import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

/**
 * Button —— 后台设计系统按钮（与主站同源，变体按管理场景裁剪）
 *
 * 变体：primary / secondary / outline / ghost / danger
 * 状态：default / hover / active / disabled / loading
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium transition-[color,background-color,border-color,box-shadow]',
    'duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-busy:pointer-events-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-hover',
        outline:
          'border border-border-strong bg-background text-foreground hover:bg-accent hover:text-accent-foreground active:bg-secondary',
        ghost:
          'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-secondary',
        danger:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-danger-600/90 active:bg-danger-600',
        /** @deprecated 使用 danger（保留别名以兼容既有代码） */
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-danger-600/90 active:bg-danger-600',
        link: 'text-primary underline-offset-4 hover:underline',
        /** @deprecated 使用 primary（保留别名以兼容既有代码） */
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active',
      },
      size: {
        sm: 'h-8 gap-1.5 rounded-md px-3 text-small',
        default: 'h-9 px-3.5 text-small',
        lg: 'h-10 px-5 text-body',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** 加载态：显示 Spinner、禁止交互并标注 aria-busy */
  loading?: boolean;
}

function Button({
  className,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? <Spinner /> : null}
      {children}
    </>
  );

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
