/**
 * 管理后台 —— 订单管理数据访问层（服务端，Phase 5.2）。
 *
 * 订单照片为业务附件：先 POST /cms/orders/uploads（临时态），
 * 创建/更新订单时以 attachmentIds 关联；图片访问统一走
 * GET /cms/orders/:id/attachments/:attId/file（后端鉴权流式输出）。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 类型 ------------------------------- */

export type OrderCurrency = 'CNY' | 'USD' | 'EUR';

export const ORDER_CURRENCIES: OrderCurrency[] = ['CNY', 'USD', 'EUR'];

export const ORDER_CURRENCY_LABELS: Record<OrderCurrency, string> = {
  CNY: '人民币（CNY）',
  USD: '美元（USD）',
  EUR: '欧元（EUR）',
};

export const ORDER_CURRENCY_SYMBOLS: Record<OrderCurrency, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
};

export interface OrderAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  code: string;
  salespersonId: string;
  salespersonName: string | null;
  customerName: string;
  country: string;
  requirement: string;
  orderedAt: string;
  closedAt: string | null;
  amount: string;
  currency: OrderCurrency;
  note: string | null;
  attachments: OrderAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type OrderResult<T> = ApiResult<T>;

export interface OrderListQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  country?: string;
  salespersonId?: string;
  orderedFrom?: string;
  orderedTo?: string;
  closedState?: 'closed' | 'open';
}

export interface OrderInput {
  customerName: string;
  country: string;
  requirement: string;
  orderedAt: string;
  closedAt?: string;
  amount: number;
  currency: OrderCurrency;
  note?: string;
  attachmentIds?: string[];
}

export interface OrderUpdateInput extends OrderInput {
  removeAttachmentIds?: string[];
}

/* ------------------------------- API ------------------------------- */

export function listOrders(
  token: string | null,
  query: OrderListQuery = {},
): Promise<OrderResult<Paginated<OrderItem>>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.country) params.set('country', query.country);
  if (query.salespersonId) params.set('salespersonId', query.salespersonId);
  if (query.orderedFrom) params.set('orderedFrom', query.orderedFrom);
  if (query.orderedTo) params.set('orderedTo', query.orderedTo);
  if (query.closedState) params.set('closedState', query.closedState);
  const qs = params.toString();
  return authorizedRequest<Paginated<OrderItem>>(`/cms/orders${qs ? `?${qs}` : ''}`, token);
}

export function getOrder(token: string | null, id: string): Promise<OrderResult<OrderItem>> {
  return authorizedRequest<OrderItem>(`/cms/orders/${encodeURIComponent(id)}`, token);
}

export function createOrder(
  token: string | null,
  input: OrderInput,
): Promise<OrderResult<OrderItem>> {
  return authorizedRequest<OrderItem>('/cms/orders', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateOrder(
  token: string | null,
  id: string,
  input: OrderUpdateInput,
): Promise<OrderResult<OrderItem>> {
  return authorizedRequest<OrderItem>(`/cms/orders/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * 订单照片上传不走本文件：由客户端经 /api/order-photos/upload 代理
 * 上传（XHR 以展示进度），代理在服务端附加 JWT 转发后端 multipart 接口。
 * 上传成功后拿到的附件 ID 在创建/更新订单时以 attachmentIds 关联。
 */

/** 订单图片鉴权访问地址（经 admin 自身代理附加 JWT；权限失败返回错误码） */
export function orderPhotoUrl(orderId: string, attachmentId: string): string {
  return `/api/order-photos/${encodeURIComponent(orderId)}/${encodeURIComponent(attachmentId)}`;
}

/** 金额展示：带币种的格式化字符串 */
export function formatOrderAmount(amount: string, currency: OrderCurrency): string {
  const symbol = ORDER_CURRENCY_SYMBOLS[currency];
  const value = Number(amount);
  if (Number.isNaN(value)) return `${symbol}${amount}`;
  return `${symbol}${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
