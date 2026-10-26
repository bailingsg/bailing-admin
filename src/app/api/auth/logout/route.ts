import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isSecureRequest } from '@/lib/session';

/**
 * POST /api/auth/logout —— 登出。
 *
 * JWT 为无状态令牌，服务端不做黑名单（阶段约定不引入 refresh token/
 * 令牌撤销表）：登出即清除 HttpOnly Cookie，客户端失去调用凭证。
 * 已签发未过期的令牌（默认 12h）在理论上仍可被持有者使用——
 * 这是 access-token 方案的已知取舍，窗口期与有效期等长。
 *
 * `secure` 必须与登录时**完全一致**：纯 HTTP 部署下若清除指令带
 * `Secure`，浏览器会整条忽略 → Cookie 清不掉 → 登出无效。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
