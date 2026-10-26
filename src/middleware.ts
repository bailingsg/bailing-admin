import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { PATHNAME_HEADER } from '@/lib/route-permissions';

/**
 * 后台路由保护（边缘层快速拦截）。
 *
 * 保护范围：/dashboard/**、/rfq/**、/products/**、/categories/**、/media/**、
 * /blog/**、/factory/**、/quality/**、/applications/**（及后续新增的 CMS 路由）。
 * 判断依据：会话 Cookie 是否存在（**不验签**——验签需要后端密钥，
 * 且边缘层只做存在性判断；伪造 Cookie 会在页面级 /auth/me 校验时被后端拒绝）。
 *
 * 未登录 → 重定向 /login?next=<原路径>（登录后返回原页面）。
 * 已登录访问 /login → 直接进入 /dashboard。
 *
 * basePath：生产部署在 80 端口 `/admin` 子路径（next.config.ts 的 basePath）。
 * Next 的 middleware 里 `pathname` 已去掉 basePath，但 `new URL()` **不会**
 * 自动补前缀 —— 必须显式拼 `request.nextUrl.basePath`，否则未登录访问
 * `/admin/dashboard` 会被重定向到根路径 `/login` → 404。
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const basePath = request.nextUrl.basePath ?? '';
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  if (pathname === '/login') {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL(`${basePath}/dashboard`, request.url));
    }
    return NextResponse.next();
  }

  // 受保护路由：无会话 Cookie → 登录页
  if (!hasSessionCookie) {
    const loginUrl = new URL(`${basePath}/login`, request.url);
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // 把当前路径透传给 Server Component：布局据此做**路由级权限守卫**。
  // Server Component 的 headers() 拿不到请求 URL，只能由中间件显式注入；
  // 这里用 set() 覆盖，客户端自带的同名头不会生效。
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  /**
   * 受保护路由清单 = `app/(dashboard)` 下的**全部**路由段。
   *
   * 曾经漏登记 `/accounts`、`/seo`、`/roles`、`/orders` 等段，后果有两个：
   *   1. 边缘层不再做 Cookie 快速拦截（只靠布局兜底，多一次后端往返）；
   *   2. 本中间件注入的 `x-admin-pathname` 缺失 → 布局的路由级权限守卫
   *      拿不到当前路径 → 放行 → 直接输 URL 能进无权限页面（BUG-06 复发）。
   * 新增 dashboard 路由时必须同步这里。
   */
  matcher: [
    '/dashboard/:path*',
    '/rfq/:path*',
    '/products/:path*',
    '/categories/:path*',
    '/media/:path*',
    '/blog/:path*',
    '/factory/:path*',
    '/quality/:path*',
    '/applications/:path*',
    '/site-content/:path*',
    '/navigation/:path*',
    '/lead-distribution/:path*',
    '/samples/:path*',
    '/orders/:path*',
    '/inventory/:path*',
    '/visitor-records/:path*',
    '/contacts/:path*',
    '/accounts/:path*',
    '/roles/:path*',
    '/seo/:path*',
    '/preview/:path*',
    '/settings/:path*',
    '/login',
  ],
};
