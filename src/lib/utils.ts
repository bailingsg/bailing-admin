import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并 Tailwind 类名，后写的类优先（shadcn/ui 标准工具函数） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
