/**
 * 管理后台 —— RFQ 询盘数据访问层（服务端）。
 *
 * 后台接口受后端 AdminTokenGuard 保护：当后端配置了 ADMIN_API_TOKEN 时，
 * 必须携带请求头 `X-Admin-Token`。令牌为**服务端变量**，绝不可用
 * NEXT_PUBLIC_ 前缀（否则会打包进浏览器）。
 */

const API_BASE = (
  process.env.ADMIN_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:4000/api/v1'
).replace(/\/$/, '');

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN ?? '';

/* ------------------------------- 类型 ------------------------------- */

export type RfqStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'CLOSED';

export const RFQ_STATUSES: RfqStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'CLOSED'];

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  NEW: '新询盘',
  CONTACTED: '已联系',
  QUOTED: '已报价',
  CLOSED: '已关闭',
};

export interface RfqListItem {
  id: string;
  name: string;
  company: string;
  email: string;
  country: string;
  phone: string | null;
  productId: string | null;
  productName: string | null;
  quantity: string | null;
  status: RfqStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RfqDetail extends RfqListItem {
  message: string;
  attachmentUrl: string | null;
}

export interface PaginatedRfq {
  items: RfqListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 数据访问结果：页面据此渲染错误态而非整页崩溃 */
export type RfqResult<T> = { ok: true; data: T } | { ok: false; error: string };

/* ------------------------------- 内部 ------------------------------- */

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ADMIN_TOKEN.trim() !== '') headers['X-Admin-Token'] = ADMIN_TOKEN;
  return headers;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<RfqResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers ?? {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    const json = (await response.json().catch(() => null)) as ApiSuccess<T> | null;

    if (!response.ok || !json || json.success !== true) {
      if (response.status === 401) {
        return { ok: false, error: '未授权：后端已启用 ADMIN_API_TOKEN，请在本后台配置同名令牌。' };
      }
      return { ok: false, error: `请求失败（HTTP ${response.status}）` };
    }

    return { ok: true, data: json.data };
  } catch (error) {
    return {
      ok: false,
      error: `无法连接后端接口：${(error as Error).message}`,
    };
  }
}

/* ------------------------------- API ------------------------------- */

export interface RfqListQuery {
  page?: number;
  pageSize?: number;
  status?: RfqStatus;
}

/** 询盘列表 */
export function getRfqList(query: RfqListQuery = {}): Promise<RfqResult<PaginatedRfq>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return request<PaginatedRfq>(`/rfq${qs ? `?${qs}` : ''}`);
}

/** 询盘详情 */
export function getRfqDetail(id: string): Promise<RfqResult<RfqDetail>> {
  return request<RfqDetail>(`/rfq/${encodeURIComponent(id)}`);
}

/** 状态流转 */
export function updateRfqStatus(id: string, status: RfqStatus): Promise<RfqResult<RfqDetail>> {
  return request<RfqDetail>(`/rfq/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/** 后台是否已配置访问令牌（用于界面提示） */
export function isAdminTokenConfigured(): boolean {
  return ADMIN_TOKEN.trim() !== '';
}
