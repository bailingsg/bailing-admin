import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * POST /api/auth/logout —— 登出。
 *
 * JWT 为无状态令牌，服务端不做黑名单（阶段约定不引入 refresh token/
 * 令牌撤销表）：登出即清除 HttpOnly Cookie，客户端失去调用凭证。
 * 已签发未过期的令牌（默认 15m）在理论上仍可被持有者使用——
 * 这是 access-token 方案的已知取舍，窗口期与有效期等长。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
