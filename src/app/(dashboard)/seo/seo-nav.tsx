'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * SEO 管理中心二级导航（Phase 5.0，任务书十一节菜单结构）。
 *
 * 与 Blog 管理一致的水平 Tab 样式；权限由侧边栏 SEO 组统一控制，
 * 这里对登录用户全量可见（后端接口另有 PermissionsGuard 拦截）。
 */
const TABS = [
  { href: '/seo', label: 'Overview' },
  { href: '/seo/pages', label: 'Pages' },
  { href: '/seo/products', label: 'Products' },
  { href: '/seo/blog', label: 'Blog' },
  { href: '/seo/media', label: 'Media SEO' },
  { href: '/seo/redirects', label: 'Redirects' },
  { href: '/seo/sitemap', label: 'Sitemap' },
  { href: '/seo/robots', label: 'Robots' },
  { href: '/seo/schema', label: 'Schema' },
  { href: '/seo/audit', label: 'SEO Audit' },
  { href: '/seo/settings', label: 'Global Settings' },
] as const;

export function SeoNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="SEO 管理导航"
      className="flex flex-wrap gap-1 border-b border-border"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/seo'
            ? pathname === '/seo'
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-small transition-colors duration-[var(--duration-fast)]',
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
