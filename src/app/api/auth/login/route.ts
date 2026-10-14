import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

/**
 * POST /api/auth/login —— 登录代理（同源路由处理器）。
 *
 * 为什么不直接用浏览器 fetch 后端 /auth/login：
 *   后端返回的是 JSON accessToken。若由浏览器直连并存入 localStorage，
 *   令牌可被任何 XSS 读取（阶段规范要求说明的风险）。这里由**服务端**
 *   代为转发：后端签发的 JWT 直接写入 HttpOnly Cookie，浏览器 JS 不可见。
 *
 * 成功：200 { ok: true }（Cookie 已设置）
 * 失败：401 { ok: false, error: 'Invalid email or password' }
 * 后端不可达：503 { ok: false, error: '...' }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (
  process.env.ADMIN_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:4000/api/v1'
).replace(/\/$/, '');

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

/** 是否为安全上下文：https 或 localhost（浏览器视 localhost 为可信源，Secure Cookie 生效） */
function isSecureContext(request: NextRequest): boolean {
  const { protocol, hostname } = request.nextUrl;
  return (
    protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体格式错误' }, { status: 400 });
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 400 });
  }

  let accessToken: string;
  try {
    const upstream = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const json = (await upstream.json().catch(() => null)) as
      | { success?: boolean; data?: { accessToken?: string } }
      | null;

    if (upstream.status === 200 && json?.success === true && json.data?.accessToken) {
      accessToken = json.data.accessToken;
    } else if (upstream.status === 401) {
      // 与后端一致的统一文案：不区分「邮箱不存在」与「口令错误」
      return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
    } else {
      return NextResponse.json(
        { ok: false, error: `后端登录服务异常（HTTP ${upstream.status}）` },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: `无法连接后端服务：${(error as Error).message}` },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });

  // HttpOnly Cookie：令牌仅在服务端可见；SameSite=Lax + Secure。
  // localhost / 127.0.0.1 在主流浏览器均被视为安全上下文，Secure 标记在本地
  // http 下同样生效；通过局域网 IP 访问时自动降级以保证可用（开发环境）。
  // 生产环境（https）始终为 Secure。
  const secure = isSecureContext(request);
  response.cookies.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
