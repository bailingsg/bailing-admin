/**
 * 管理后台 —— RFQ 询盘数据访问层（服务端）。
 *
 * Phase 0 起后台接口改为 JWT + RBAC 鉴权（rfq.read / rfq.update）：
 *   · 令牌来自 HttpOnly Cookie（`admin_session`），只在服务端读取并转发
 *   · 与产品 / 博客等 CMS 模块使用同一套认证与权限体系
 *   · 旧的 X-Admin-Token 共享密钥通道仅保留给服务间调用，未配置即拒绝（fail-closed）
 */

import { authorizedRequest, type ApiResult } from './api';

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
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assignedAt: string | null;
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
export type RfqResult<T> = ApiResult<T>;

/* ------------------------------- API ------------------------------- */

export interface RfqListQuery {
  page?: number;
  pageSize?: number;
  status?: RfqStatus;
}

/** 询盘列表（需要 rfq.read） */
export function getRfqList(
  token: string | null,
  query: RfqListQuery = {},
): Promise<RfqResult<PaginatedRfq>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return authorizedRequest<PaginatedRfq>(`/rfq${qs ? `?${qs}` : ''}`, token);
}

/** 询盘详情（需要 rfq.read） */
export function getRfqDetail(token: string | null, id: string): Promise<RfqResult<RfqDetail>> {
  return authorizedRequest<RfqDetail>(`/rfq/${encodeURIComponent(id)}`, token);
}

/** 状态流转（需要 rfq.update） */
export function updateRfqStatus(
  token: string | null,
  id: string,
  status: RfqStatus,
): Promise<RfqResult<RfqDetail>> {
  return authorizedRequest<RfqDetail>(`/rfq/${encodeURIComponent(id)}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
