'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: '概览', hint: '系统状态' },
  { href: '/rfq', label: '询盘管理', hint: 'RFQ' },
  { href: '/#products', label: '产品管理', hint: 'CMS 阶段' },
  { href: '/#content', label: '内容管理', hint: 'CMS 阶段' },
];

/**
 * AdminSidebar —— 后台侧边导航
 *
 * 视觉：深色侧边栏（专业管理系统风格，不使用营销官网配色）。
 * 响应式：>= 768px 左侧固定导航；< 768px 收起为顶部栏 + 汉堡展开面板。
 * 仅提供导航骨架，不包含权限控制与业务页面。
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const panelId = 'admin-sidebar-nav';

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <aside className="shrink-0 bg-sidebar text-sidebar-foreground md:min-h-screen md:w-56 md:border-r md:border-sidebar-border">
      <div className="flex h-14 items-center justify-between px-4 md:h-auto md:px-5 md:py-5">
        <Link
          href="/"
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
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
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
