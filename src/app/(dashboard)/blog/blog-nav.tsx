'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * 博客管理二级导航（文章列表 / 分类管理 / 标签管理）。
 *
 * Phase 4.4 不引入 RBAC，导航项对登录用户全量可见；
 * 未来接入权限时在此按权限过滤即可。
 */
const TABS = [
  { href: '/blog', label: '文章列表' },
  { href: '/blog/categories', label: '分类管理' },
  { href: '/blog/tags', label: '标签管理' },
] as const;

export function BlogNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="博客管理导航" className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        // 文章列表同时匹配 /blog/create 与 /blog/[id]/edit
        const active =
          tab.href === '/blog'
            ? pathname === '/blog' ||
              pathname.startsWith('/blog/create') ||
              /^\/blog\/[^/]+\/edit$/.test(pathname)
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-small transition-colors duration-[var(--duration-fast)]',
              active
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-text-secondary hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
