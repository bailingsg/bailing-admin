/**
 * 表单控件共享样式
 *
 * 统一 Input / Textarea / Select 的边框、圆角、焦点环、禁用与错误态，
 * 保证表单视觉一致（RFQ、Contact 表单将直接复用）。
 * 颜色全部走语义令牌，支持深色模式扩展。
 */
export const fieldBaseClasses = [
  'w-full rounded-md border border-border bg-background text-body text-foreground',
  'placeholder:text-text-muted',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:text-disabled-foreground',
  'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
].join(' ');
