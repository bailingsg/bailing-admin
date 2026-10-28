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
 * 后台导航项（二级菜单）。
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

/** 一级菜单：可折叠分组 */
export interface NavGroup {
  /** 分组 key（用于展开态判断） */
  key: string;
  label: string;
  /** 二级菜单；分组可见性由子项决定（任一子项有权即渲染整组） */
  children: NavItem[];
}

/**
 * 一级菜单（模块）与二级菜单（功能）—— 2026-10-28 第二次改版。
 *
 * 演进过程，别再走回头路：
 *   ① 最初 20 项**全平铺** → 找「库存管理」得数格子；
 *   ② 第一次改成「分区标题 + 全展开」→ 标题只是 11px 灰字，视觉上压不住
 *      下面同字号的菜单项，看起来像误加的标签，而且总高溢出视口；
 *   ③ 现在（本版）：**模块 = 一级菜单，可折叠可展开；功能 = 二级菜单，缩进挂在下面**。
 *      默认只展开「当前路由所在的那一组」，其余收起 —— 侧栏总高恒定在一屏内。
 *
 * 一级菜单用按钮（button）而非链接：它本身不是页面，只是开关。
 * 概览是单页入口，不套分组（一个孩子的分组等于多一次点击）。
 */
const NAV_GROUPS: NavGroup[] = [
  {
    // 内容 = 前台要靠编辑不断更新的东西：产品、分类、文章、案例、图片
    key: 'content',
    label: '内容管理',
    children: [
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
    // 站点建设 = 搭骨架与门面：页面文案、导航、企业实力页
    key: 'site',
    label: '站点建设',
    children: [
      {
        href: '/site-content',
        label: '站点内容',
        permissions: ROUTE_PERMISSIONS['/site-content'] ?? [],
      },
      { href: '/navigation', label: '导航管理', permissions: ROUTE_PERMISSIONS['/navigation'] ?? [] },
      { href: '/factory', label: '工厂实力', permissions: ROUTE_PERMISSIONS['/factory'] ?? [] },
      { href: '/quality', label: '质量体系', permissions: ROUTE_PERMISSIONS['/quality'] ?? [] },
    ],
  },
  {
    // SEO 单独成组：11 个子页，塞进「站点建设」会把那组撑到 15 项
    key: 'seo',
    label: 'SEO',
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
  {
    // 业务运营 = 一条订单从询盘到发货的完整链路，顺序即业务流程
    key: 'business',
    label: '业务运营',
    children: [
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
    children: [
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
    children: [
      { href: '/contacts', label: '员工联系方式', permissions: ROUTE_PERMISSIONS['/contacts'] ?? [] },
      { href: '/accounts', label: '账号管理', permissions: ROUTE_PERMISSIONS['/accounts'] ?? [] },
      { href: '/roles', label: '角色与权限', permissions: ROUTE_PERMISSIONS['/roles'] ?? [] },
    ],
  },
];

/** 顶部独立入口（不套分组） */
const NAV_HOME: NavItem = {
  href: '/dashboard',
  label: '概览',
  permissions: ROUTE_PERMISSIONS['/dashboard'] ?? [],
};

/**
 * 二级菜单是否命中当前路由。
 *
 * 特例 `/seo`：它既是分组首页又带子路由，只精确匹配，
 * 否则 `/seo/pages` 会把「概览」也点亮。
 */
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
 * 层级：一级菜单 = 模块（可折叠），二级菜单 = 功能（缩进）。
 *       默认只展开当前路由所在的分组；进入其它分组时自动展开它。
 *       权限过滤后分组为空则不渲染该分组。
 *
 * @param permissions 当前账号的生效权限 key（服务端从 /auth/me 取，避免客户端猜权限）
 */
export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const panelId = 'admin-sidebar-nav';
  const allowed = (item: { permissions: string[] }): boolean =>
    item.permissions.length === 0 || item.permissions.some((p) => permissions.includes(p));

  /** 分组是否包含当前路由 */
  const isGroupActive = (group: NavGroup): boolean =>
    group.children.some((child) => matchesChild(child.href, pathname));

  // 分组展开态：首屏只展开当前路由所在的分组（避免水合后二次展开的闪烁）
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((group) => [group.key, isGroupActive(group)])),
  );

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 路由变化后自动展开命中的分组；其它分组保留用户手动展开/收起的状态
  React.useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of NAV_GROUPS) {
        const active = group.children.some((child) => matchesChild(child.href, pathname));
        if (active && !next[group.key]) {
          next[group.key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  /** 一级菜单：可折叠按钮 */
  const renderGroup = (group: NavGroup) => {
    const children = group.children.filter(allowed);
    if (children.length === 0) return null;

    const groupActive = isGroupActive(group);
    const expanded = openGroups[group.key] ?? false;
    const childrenId = `${group.key}-nav`;

    return (
      <div key={group.key} className="flex flex-col gap-0.5">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={childrenId}
          onClick={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !expanded }))}
          className={cn(
            // 一级菜单：字号/字重都比二级重一档，右侧带展开箭头，
            // 让人一眼看出「这是个开关」而不是页面入口
            'flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-small font-medium',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:ring-2 focus-visible:ring-ring/60',
            groupActive
              ? 'bg-sidebar-active text-sidebar-foreground'
              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
          )}
        >
          <span>{group.label}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-[var(--duration-fast)]',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
          />
        </button>

        {expanded ? (
          <div
            id={childrenId}
            className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2"
          >
            {children.map((child) => {
              const active = matchesChild(child.href, pathname);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1 text-caption',
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
  };

  const homeActive = pathname === NAV_HOME.href;

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
        {/* 概览：单页入口，不套分组 */}
        {allowed(NAV_HOME) ? (
          <Link
            href={NAV_HOME.href}
            aria-current={homeActive ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-small font-medium',
              'transition-colors duration-[var(--duration-fast)]',
              homeActive
                ? 'bg-sidebar-active text-sidebar-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
            )}
          >
            {NAV_HOME.label}
          </Link>
        ) : null}

        {NAV_GROUPS.map(renderGroup)}
      </nav>
    </aside>
  );
}
