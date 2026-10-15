import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

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
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  if (pathname === '/login') {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 受保护路由：无会话 Cookie → 登录页
  if (!hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
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
    '/login',
  ],
};
