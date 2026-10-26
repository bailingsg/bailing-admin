/**
 * 中间件注入、布局读取的"当前路径"请求头。
 * 放在这里是为了让中间件与布局引用同一个常量，避免拼写漂移。
 */
export const PATHNAME_HEADER = 'x-admin-pathname';

/**
 * 后台路由 → 所需权限（**单一事实源**）。
 *
 * 用途有两处，必须完全一致，否则会出现"侧栏看得见、点进去被拦"或
 * "侧栏看不见、直接输 URL 却能进"的矛盾：
 *   1. `components/admin-sidebar.tsx`：决定导航项是否渲染；
 *   2. `app/(dashboard)/layout.tsx`：决定当前路由是否放行（路由级守卫）。
 *
 * 权限 key 与后端 `permission.registry.ts` 逐字对应。
 * 命中规则：`pathname === prefix` 或 `pathname` 以 `${prefix}/` 开头
 * （因此 `/seo` 覆盖 `/seo/media` 等全部子路由）。
 *
 * 注意：这是**界面层**的可见性/可达性控制，真正的权限边界在后端
 * PermissionsGuard —— 即使绕过前端直接调接口，后端仍会 403。
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['dashboard.read'],
  '/products': ['products.read'],
  '/categories': ['categories.read'],
  '/media': ['media.read'],
  '/blog': ['blog.read'],
  '/applications': ['applications.read'],
  '/factory': ['factory.read'],
  '/quality': ['quality.read'],
  '/site-content': ['site.read'],
  '/navigation': ['nav.read'],
  '/rfq': ['rfq.read'],
  '/lead-distribution': ['lead_distribution.read'],
  '/samples': ['samples.read'],
  '/orders': ['orders.read'],
  '/inventory': ['inventory.read'],
  '/visitor-records': ['visitor_records.read'],
  '/contacts': ['contacts.read'],
  '/accounts': ['accounts.read'],
  '/roles': ['roles.read'],
  '/seo': ['seo.read'],
};

/*
 * 刻意**不登记**的路由：
 *   · `/settings/profile`（我的资料）：任何已登录账号都要能改自己的资料，
 *     登记权限会把普通业务账号挡在外面；
 *   · `/preview/**`（内容预览）：一个 catch-all 路由承载六类内容，无法用
 *     单一前缀表达"取决于被预览的模块"，因此放行——页面内部仍会带令牌
 *     调后端预览接口，权限不足时后端返回 403，界面显示错误提示。
 */

/**
 * 当前路由要求的权限（命中任意一个即可）。
 *
 * 返回 null 表示该路由不在受控清单里 —— 调用方应放行（新增页面忘了登记时
 * 只是少了界面提示，不会把正常用户挡在外面；后端仍然校验权限）。
 */
export function requiredPermissionsFor(pathname: string): string[] | null {
  const clean = pathname.split('?')[0] ?? pathname;
  let matched: string | null = null;

  for (const prefix of Object.keys(ROUTE_PERMISSIONS)) {
    if (clean !== prefix && !clean.startsWith(`${prefix}/`)) continue;
    // 取最长前缀：避免未来出现 `/product` 与 `/products` 这类包含关系时误判
    if (!matched || prefix.length > matched.length) matched = prefix;
  }

  return matched ? (ROUTE_PERMISSIONS[matched] ?? null) : null;
}
