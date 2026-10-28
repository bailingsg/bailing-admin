'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { withBasePath } from '@/lib/base-path';
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions';

/**
 * 后台导航项。
 *
 * Phase 4.6 起，入口按**导航权限**动态显示：只有账号具备对应权限时才渲染，
 * 不再展示点了也进不去的菜单项（权限由后端 /auth/me 的 permissions 提供）。
 *
 * 文案规范：后台是内部中文界面，导航一律用中文；只有 SEO 这类行业通用缩写保留原文。
 */
export interface NavItem {
  href: string;
  label: string;
  /** 展示该入口所需的权限 key（命中任意一个即可） */
  permissions: string[];
}

/** 可折叠菜单组（Phase 5.0：SEO 管理中心） */
export interface NavGroup {
  /** 分组 key（用于展开态判断） */
  key: string;
  label: string;
  /** 展示该分组所需的权限 key（命中任意一个即可） */
  permissions: string[];
  children: NavItem[];
}

/** 普通入口或可折叠分组 */
type NavEntry = NavItem | NavGroup;

/**
 * 导航分区（2026-10-28 加）。
 *
 * 背景：侧栏平铺到 20 项时，找「库存管理」要在一条没有停顿的列表里数格子，
 * 新人根本不知道哪些是内容、哪些是交易。分区只加**视觉标题**，不做折叠：
 * 条目总数才 20 个，折叠会让每次跳转多一次点击，反而更慢。
 *
 * 分区顺序按使用频率与心智模型排：先看板，再管内容，最后配系统。
 * 权限过滤后**整区为空则连标题一起隐藏**，不留孤零零的「业务运营」标题。
 */
export interface NavSection {
  key: string;
  /** 分区标题；null = 顶部独立入口（概览），不加标题 */
  label: string | null;
  items: NavEntry[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'home',
    label: null,
    items: [
      { href: '/dashboard', label: '概览', permissions: ROUTE_PERMISSIONS['/dashboard'] ?? [] },
    ],
  },
  {
    // 内容 = 前台要靠编辑不断更新的东西：产品、分类、文章、案例、图片
    key: 'content',
    label: '内容管理',
    items: [
      { href: '/products', label: '产品管理', permissions: ROUTE_PERMISSIONS['/products'] ?? [] },
      { href: '/categories', label: '产品分类', permissions: ROUTE_PERMISSIONS['/categories'] ?? [] },
      { href: '/blog', label: '博客管理', permissions: ROUTE_PERMISSIONS['/blog'] ?? [] },
      {
        href: '/applications',
        label: '应用场景',
        permissions: ROUTE_PERMISSIONS['/applications'] ?? [],
      },
      { href: '/media', label: '媒体资源', permissions: ROUTE_PERMISSIONS['/media'] ?? [] },
    ],
  },
  {
    // 站点建设 = 搭骨架与门面：页面文案、导航、企业实力页、SEO
    key: 'site',
    label: '站点建设',
    items: [
      {
        href: '/site-content',
        label: '站点内容',
        permissions: ROUTE_PERMISSIONS['/site-content'] ?? [],
      },
      { href: '/navigation', label: '导航管理', permissions: ROUTE_PERMISSIONS['/navigation'] ?? [] },
      { href: '/factory', label: '工厂实力', permissions: ROUTE_PERMISSIONS['/factory'] ?? [] },
      { href: '/quality', label: '质量体系', permissions: ROUTE_PERMISSIONS['/quality'] ?? [] },
      {
        key: 'seo',
        label: 'SEO',
        permissions: ROUTE_PERMISSIONS['/seo'] ?? [],
        children: [
          { href: '/seo', label: '概览', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/pages', label: '页面', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/products', label: '产品', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/blog', label: '博客', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/media', label: '媒体 SEO', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/redirects', label: '重定向', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/sitemap', label: '站点地图', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/robots', label: '爬虫规则', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/schema', label: '结构化数据', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/audit', label: 'SEO 体检', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
          { href: '/seo/settings', label: '全局设置', permissions: ROUTE_PERMISSIONS['/seo'] ?? [] },
        ],
      },
    ],
  },
  {
    // 业务运营 = 一条订单从询盘到发货的完整链路，顺序即业务流程
    key: 'business',
    label: '业务运营',
    items: [
      { href: '/rfq', label: '询盘管理', permissions: ROUTE_PERMISSIONS['/rfq'] ?? [] },
      {
        href: '/lead-distribution',
        label: '询盘分配',
        permissions: ROUTE_PERMISSIONS['/lead-distribution'] ?? [],
      },
      { href: '/samples', label: '样品管理', permissions: ROUTE_PERMISSIONS['/samples'] ?? [] },
      { href: '/orders', label: '订单管理', permissions: ROUTE_PERMISSIONS['/orders'] ?? [] },
      { href: '/inventory', label: '库存管理', permissions: ROUTE_PERMISSIONS['/inventory'] ?? [] },
    ],
  },
  {
    // 数据分析 = 只看不改的旁路数据，与业务操作分开
    key: 'insight',
    label: '数据分析',
    items: [
      {
        href: '/visitor-records',
        label: '访客记录',
        permissions: ROUTE_PERMISSIONS['/visitor-records'] ?? [],
      },
    ],
  },
  {
    // 系统设置 = 改这些会影响别人，天然属于「管理员才碰」的一组
    key: 'system',
    label: '系统设置',
    items: [
      { href: '/contacts', label: '员工联系方式', permissions: ROUTE_PERMISSIONS['/contacts'] ?? [] },
      { href: '/accounts', label: '账号管理', permissions: ROUTE_PERMISSIONS['/accounts'] ?? [] },
      { href: '/roles', label: '角色与权限', permissions: ROUTE_PERMISSIONS['/roles'] ?? [] },
    ],
  },
];

/** 所有入口拉平（用于分组展开态等全局判断） */
const ALL_GROUPS: NavGroup[] = NAV_SECTIONS.flatMap((section) =>
  section.items.filter((entry): entry is NavGroup => 'children' in entry),
);

/** 类型收窄：有 children 即为可折叠分组 */
function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

/** 子路由是否命中（`/seo` 只匹配自身，其余匹配前缀） */
function matchesChild(href: string, pathname: string): boolean {
  if (href === '/seo') return pathname === '/seo';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * AdminSidebar —— 后台侧边导航
 *
 * 视觉：深色侧边栏（专业管理系统风格，不使用营销官网配色）。
 * 布局：>= 768px 为**浮动**侧栏 —— 上/下/左三边顶到视口边缘，仅右侧留白，
 *       因此只有右侧两角是圆角；sticky 吸附在视口左侧，内容滚动时自身不动。
 *       导航过长时在栏内滚动，滚动条隐藏（不占宽、不打断视觉）。
 *       < 768px 收起为顶部栏 + 汉堡展开面板。
 * 分组：按业务域分 6 区（概览 / 内容管理 / 站点建设 / 业务运营 / 数据分析 / 系统设置），
 *       分区只加视觉标题不折叠；SEO 是区内唯一的可折叠子分组，进入 /seo/* 时自动展开。
 *       权限过滤后整区为空则连标题一起隐藏。
 *
 * @param permissions 当前账号的生效权限 key（服务端从 /auth/me 取，避免客户端猜权限）
 */
export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // 分组展开态：首屏按当前路由初始化（避免水合后二次展开的闪烁）
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      ALL_GROUPS.map((group) => [
        group.key,
        group.children.some((child) => matchesChild(child.href, pathname)),
      ]),
    ),
  );

  const panelId = 'admin-sidebar-nav';
  const allowed = (item: { permissions: string[] }): boolean =>
    item.permissions.length === 0 ||
    item.permissions.some((p) => permissions.includes(p));

  // 分组默认展开规则：位于分组任一子路由时自动展开
  const isGroupActive = (group: NavGroup): boolean =>
    group.children.some((child) => matchesChild(child.href, pathname));

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 路由变化后，若进入了某分组的子路由则展开它（手动折叠的状态在离开该分组后不再保留）
  React.useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of ALL_GROUPS) {
        const active = group.children.some((child) => matchesChild(child.href, pathname));
        if (active && !next[group.key]) {
          next[group.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  /** 渲染单个入口：普通链接，或可折叠分组（SEO） */
  const renderEntry = (entry: NavEntry) => {
    if (isGroup(entry)) {
      const groupActive = isGroupActive(entry);
      const expanded = openGroups[entry.key] ?? false;
      const childrenId = `${entry.key}-nav`;

      return (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={childrenId}
            onClick={() => setOpenGroups((prev) => ({ ...prev, [entry.key]: !expanded }))}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md px-3 py-1 text-small',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:ring-2 focus-visible:ring-ring/60',
              groupActive
                ? 'bg-sidebar-active font-medium text-sidebar-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
            )}
          >
            <span>{entry.label}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 transition-transform duration-[var(--duration-fast)]',
                expanded ? 'rotate-0' : '-rotate-90',
              )}
            />
          </button>

          {expanded ? (
            <div
              id={childrenId}
              className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2"
            >
              {entry.children.map((child) => {
                const active = matchesChild(child.href, pathname);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-caption',
                      'transition-colors duration-[var(--duration-fast)]',
                      active
                        ? 'bg-sidebar-active font-medium text-sidebar-foreground'
                        : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    }

    // 概览是精确匹配，其余按前缀匹配（/products 覆盖 /products/new 等）
    const active =
      entry.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === entry.href || pathname.startsWith(`${entry.href}/`);

    return (
      <Link
        href={entry.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          // py-1 而非 py-2：加 5 个分区标题后总高会顶出视口。
          // 实测 1440×1000 下 py-2 溢出 ~140px、py-1.5 溢出 41px，
          // py-1 + 标题收紧后才在 1080p 笔记本（视口约 950）一屏装下。
          'rounded-md px-3 py-1 text-small',
          'transition-colors duration-[var(--duration-fast)]',
          active
            ? 'bg-sidebar-active font-medium text-sidebar-foreground'
            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
        )}
      >
        {entry.label}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'shrink-0 bg-sidebar text-sidebar-foreground',
        // 浮动侧栏：上/下/左顶到视口边缘，仅右侧留 1rem 与内容区拉开；
        // 高度锁定一屏，self-start 让 sticky 生效（flex 子项默认被拉伸）
        'md:sticky md:top-0 md:mr-4 md:flex md:h-screen md:w-56 md:flex-col',
        'md:self-start md:overflow-hidden md:rounded-r-lg md:shadow-lg',
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4 md:h-auto md:px-5 md:py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-sm text-small font-semibold tracking-tight text-sidebar-foreground outline-none"
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/15">
            <Image
              src={withBasePath('/logo.webp')}
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
          // md 下浮动栏高度固定，导航区吃掉剩余高度并独立滚动（min-h-0 让 flex 子项可收缩）；
          // 滚动条隐藏：不占宽度，避免深色面板上出现一条浅色滚动槽
          'flex-col gap-0.5 px-3 pb-4 md:flex md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pb-4',
          'md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden',
          open ? 'flex' : 'hidden',
        )}
      >
        {NAV_SECTIONS.map((section) => {
          // 权限过滤后整区为空 → 标题也一起不渲染（不留空标题）
          const visible = section.items.filter(allowed);
          if (visible.length === 0) return null;

          return (
            <div key={section.key} className="flex flex-col gap-0.5">
              {section.label ? (
                // 分区标题：小字 + 弱色 + 字距，只做视觉停顿，不可点击
                <p className="px-3 pb-0.5 pt-1.5 text-[11px] font-medium tracking-[0.08em] text-sidebar-muted">
                  {section.label}
                </p>
              ) : null}
              {visible.map((entry) => (
                <React.Fragment key={isGroup(entry) ? entry.key : entry.href}>
                  {renderEntry(entry)}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
