import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, isSecureRequest } from '@/lib/session';

/**
 * POST /api/auth/login —— 登录代理（同源路由处理器）。
 *
 * 为什么不直接用浏览器 fetch 后端 /auth/login：
 *   后端返回的是 JSON accessToken。若由浏览器直连并存入 localStorage，
 *   令牌可被任何 XSS 读取（阶段规范要求说明的风险）。这里由**服务端**
 *   代为转发：后端签发的 JWT 直接写入 HttpOnly Cookie，浏览器 JS 不可见。
 *
 * 两种请求体：
 *   · `application/json`（已水合的登录表单，走 fetch）→ 回 JSON
 *   · `application/x-www-form-urlencoded` / `multipart/form-data`
 *     （**未水合或禁用 JS 时浏览器的原生表单提交**）→ 303 跳转
 *
 * 原生提交这一支很关键：登录表单若没有 `method`，浏览器默认用 GET 提交，
 * 口令会进 URL（历史记录 / 服务端访问日志 / Referer 全都会带上）。表单已显式
 * `method="post"` 并指向本路由，这里必须能接住表单编码，否则未水合时的回车
 * 会得到一个 405 页面。两条分支的成功/失败语义保持一致。
 *
 * 成功：200 { ok: true }（Cookie 已设置）/ 303 → 目标页
 * 失败：401 { ok: false, error: 'Invalid email or password' } / 303 → /login?error=…
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

/** 登录后的落地路径：只接受站内绝对路径，避免被当成开放重定向跳板 */
function safeNextPath(value: string | null | undefined): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

/**
 * 按**真实请求来源**拼绝对跳转地址。
 *
 * 不能用 `new URL(path, request.url)`：Next 路由处理器里 `request.url` 是服务器
 * 内部地址（`http://localhost:3001`），用户从 `http://127.0.0.1:3001` 访问时
 * 会被跳到另一个源 —— Cookie 是按源存放的，跳过去就丢了会话（表现为"登录成功
 * 却立刻被弹回登录页"）。这里改用 Host / X-Forwarded-* 还原用户实际访问的源，
 * 与 `isSecureRequest` 取源头的口径保持一致。
 */
function requestOrigin(request: NextRequest): string {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    request.nextUrl.protocol.replace(':', '');
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host;
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? '';
  const isFormSubmit =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');
  const basePath = request.nextUrl.basePath ?? '';

  /** 失败响应：表单提交用 303 回登录页（带可读提示），fetch 用 JSON + 状态码 */
  const fail = (status: number, message: string): NextResponse => {
    if (!isFormSubmit) {
      return NextResponse.json({ ok: false, error: message }, { status });
    }
    const target = new URL(`${basePath}/login`, requestOrigin(request));
    target.searchParams.set('error', message);
    return NextResponse.redirect(target, 303);
  };

  let email: string;
  let password: string;
  let next = '/dashboard';

  if (isFormSubmit) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail(400, '请求体格式错误');
    }
    email = String(form.get('email') ?? '').trim();
    password = String(form.get('password') ?? '');
    const rawNext = form.get('next');
    next = safeNextPath(typeof rawNext === 'string' ? rawNext : null);
  } else {
    let body: LoginRequestBody;
    try {
      body = (await request.json()) as LoginRequestBody;
    } catch {
      return fail(400, '请求体格式错误');
    }
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return fail(400, '请输入邮箱与口令');
    }
    email = body.email.trim();
    password = body.password;
  }

  // 空串在类型上合法，但必然被后端 ValidationPipe 拒掉（email must be an email）。
  // 这里前置拦截，避免把「用户没填」包装成「后端服务异常」误导排查。
  if (!email || !password) {
    return fail(400, '请输入邮箱与口令');
  }

  let accessToken: string;
  try {
    const upstream = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
      return fail(401, 'Invalid email or password');
    } else if (upstream.status === 400) {
      // 后端参数校验失败（邮箱格式不合法等）——属输入问题，必须回 400，
      // 不能报成 502 服务异常（会让人误以为后端挂了）
      return fail(400, '邮箱或口令格式不正确');
    } else {
      return fail(502, `后端登录服务异常（HTTP ${upstream.status}）`);
    }
  } catch (error) {
    return fail(503, `无法连接后端服务：${(error as Error).message}`);
  }

  // HttpOnly Cookie：令牌仅在服务端可见；SameSite=Lax + Secure。
  // localhost / 127.0.0.1 在主流浏览器均被视为安全上下文，Secure 标记在本地
  // http 下同样生效；通过局域网 IP 访问时自动降级以保证可用（开发环境）。
  // 生产环境（https）始终为 Secure。
  const secure = isSecureRequest(request);
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  if (isFormSubmit) {
    const response = NextResponse.redirect(
      new URL(`${basePath}${next}`, requestOrigin(request)),
      303,
    );
    response.cookies.set(SESSION_COOKIE, accessToken, cookieOptions);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, accessToken, cookieOptions);
  return response;
}
