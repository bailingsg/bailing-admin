import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * POST /api/order-photos/upload —— 订单照片上传代理（Phase 5.2）。
 *
 * 与图片读取代理同思路：浏览器拿不到 HttpOnly Cookie 里的 JWT，
 * 上传也由本路由在服务端附加 Authorization 后转发后端 multipart 接口。
 * 使用路由处理器（而非 server action）是为了规避 server action 的
 * 默认体积上限，支持到 10MB 的单张照片。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (
  process.env.ADMIN_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:4000/api/v1'
).replace(/\/$/, '');

export async function POST(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 });
  }

  let inbound: FormData;
  try {
    inbound = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: '上传内容解析失败' }, { status: 400 });
  }

  const file = inbound.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: '缺少文件字段 file' }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append('file', file, file.name);

  const upstream = await fetch(`${API_BASE}/cms/orders/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: outbound,
    cache: 'no-store',
  });

  const body = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': contentType },
  });
}
