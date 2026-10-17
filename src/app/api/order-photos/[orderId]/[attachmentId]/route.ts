import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * GET /api/order-photos/:orderId/:attachmentId —— 订单照片鉴权代理（Phase 5.2）。
 *
 * 为什么需要它：后端订单图片接口要求 JWT，而浏览器 <img src> 不能带
 * Authorization 头；同时订单文件不落在静态可访问目录。故由本路由
 * 在服务端附加 HttpOnly Cookie 中的令牌转发，用户只能看到有权限的图片。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (
  process.env.ADMIN_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:4000/api/v1'
).replace(/\/$/, '');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string; attachmentId: string }> },
): Promise<NextResponse> {
  const { orderId, attachmentId } = await params;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 });
  }

  const response = await fetch(
    `${API_BASE}/cms/orders/${encodeURIComponent(orderId)}/attachments/${encodeURIComponent(
      attachmentId,
    )}/file`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const message =
      response.status === 404
        ? '无权查看该订单照片'
        : `图片加载失败（HTTP ${response.status}）`;
    return NextResponse.json({ ok: false, error: message }, { status: response.status });
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const contentDisposition = response.headers.get('content-disposition');
  const buffer = await response.arrayBuffer();
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=300',
  };
  if (contentDisposition) headers['Content-Disposition'] = contentDisposition;

  return new NextResponse(buffer, { status: 200, headers });
}
