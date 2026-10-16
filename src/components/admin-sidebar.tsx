'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * 后台导航项。
 *
 * Phase 4.6 起，入口按**导航权限**动态显示：只有账号具备对应权限时才渲染，
 * 不再展示点了也进不去的菜单项（权限由后端 /auth/me 的 permissions 提供）。
 */
export interface NavItem {
  href: string;
  label: string;
  hint: string;
  /** 展示该入口所需的权限 key（命中任意一个即可） */
  permissions: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', hint: '概览', permissions: ['dashboard.read'] },
  { href: '/products', label: 'Products', hint: '产品管理', permissions: ['products.read'] },
  { href: '/categories', label: 'Categories', hint: '产品分类', permissions: ['categories.read'] },
  { href: '/media', label: 'Media', hint: '媒体资源', permissions: ['media.read'] },
  { href: '/blog', label: 'Blog', hint: '博客管理', permissions: ['blog.read'] },
  { href: '/applications', label: 'Applications', hint: '应用场景', permissions: ['applications.read'] },
  { href: '/factory', label: 'Factory', hint: '工厂实力', permissions: ['factory.read'] },
  { href: '/quality', label: 'Quality', hint: '质量体系', permissions: ['quality.read'] },
  { href: '/site-content', label: 'Site Content', hint: '站点内容', permissions: ['site.read'] },
  { href: '/navigation', label: 'Navigation', hint: '导航管理', permissions: ['nav.read'] },
  { href: '/rfq', label: 'RFQ', hint: '询盘管理', permissions: ['rfq.read'] },
  {
    href: '/lead-distribution',
    label: '询盘分配',
    hint: '轮询与倾斜',
    permissions: ['lead_distribution.read'],
  },
  { href: '/contacts', label: '员工联系方式', hint: '对外联系人', permissions: ['contacts.read'] },
  { href: '/accounts', label: '账号管理', hint: '员工账号', permissions: ['accounts.read'] },
  { href: '/roles', label: '角色与权限', hint: 'RBAC', permissions: ['roles.read'] },
];

/**
 * AdminSidebar —— 后台侧边导航
 *
 * 视觉：深色侧边栏（专业管理系统风格，不使用营销官网配色）。
 * 响应式：>= 768px 左侧固定导航；< 768px 收起为顶部栏 + 汉堡展开面板。
 *
 * @param permissions 当前账号的生效权限 key（服务端从 /auth/me 取，避免客户端猜权限）
 */
export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const panelId = 'admin-sidebar-nav';
  const allowed = (item: NavItem): boolean =>
    item.permissions.length === 0 ||
    item.permissions.some((p) => permissions.includes(p));

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <aside className="shrink-0 bg-sidebar text-sidebar-foreground md:min-h-screen md:w-56 md:border-r md:border-sidebar-border">
      <div className="flex h-14 items-center justify-between px-4 md:h-auto md:px-5 md:py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-sm text-small font-semibold tracking-tight text-sidebar-foreground outline-none"
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/15">
            <Image
              src="/logo.webp"
              alt="Bailing Wooden logo"
              width={28}
              height={28}
              priority
              className="size-7 object-contain"
            />
          </span>
          Bailing Admin
        </Link>

        <button
          type="button"
          aria-label={open ? '关闭导航' : '展开导航'}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-md text-sidebar-foreground md:hidden',
            'transition-colors duration-[var(--duration-fast)] hover:bg-sidebar-hover',
            'focus-visible:ring-2 focus-visible:ring-ring/60',
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      <nav
        id={panelId}
        aria-label="后台导航"
        className={cn(
          'flex-col gap-1 px-3 pb-4 md:flex md:pb-5',
          open ? 'flex' : 'hidden',
        )}
      >
        {NAV_ITEMS.filter(allowed).map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-small',
                'transition-colors duration-[var(--duration-fast)]',
                active
                  ? 'bg-sidebar-active font-medium text-sidebar-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
              )}
            >
              <span>{item.label}</span>
              <span className="text-caption text-sidebar-muted">{item.hint}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
