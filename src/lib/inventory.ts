/**
 * 管理后台 —— 库存管理数据访问层（服务端，Phase 5.3）。
 *
 * 库存为业务数据（单仓库）：
 *   · 创建人恒为当前登录用户（后端从会话确定）；
 *   · 可关联订单（orderId 可空），订单号从关联订单实时读取；
 *   · 数量以字符串传递（后端 Decimal(14,3) 序列化），避免浮点精度损失。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 类型 ------------------------------- */

/** 计量单位白名单（与后端 INVENTORY_UNITS 一致） */
export const INVENTORY_UNITS = [
  '张',
  '片',
  '块',
  '套',
  '件',
  '根',
  '立方米',
  '平方米',
  '米',
  '千克',
  '吨',
] as const;

export interface InventoryItem {
  id: string;
  /** 库存编号（系统生成，全局唯一，不可编辑） */
  code: string;
  productName: string;
  productDetail: string;
  /** 数量（字符串，最多三位小数） */
  quantity: string;
  unit: string;
  location: string;
  storedAt: string;
  /** 关联订单 ID（可空） */
  orderId: string | null;
  /** 关联订单号（从关联订单读取，可空） */
  orderCode: string | null;
  createdById: string;
  creatorName: string | null;
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

export type InventoryResult<T> = ApiResult<T>;

export interface InventoryListQuery {
  page?: number;
  limit?: number;
  /** 库存编号（精确） */
  code?: string;
  /** 关键词（产品名称 / 产品详情） */
  keyword?: string;
  /** 存放位置（模糊） */
  location?: string;
  /** 关联订单号（精确） */
  orderCode?: string;
  /** 存放日期范围（ISO 字符串） */
  storedFrom?: string;
  storedTo?: string;
}

export interface InventoryInput {
  productName: string;
  productDetail: string;
  quantity: number;
  unit: string;
  location: string;
  /** 存放日期（ISO 字符串；datetime-local 值亦可，后端校验） */
  storedAt: string;
  /** 关联订单 ID（可空） */
  orderId?: string | null;
}

/* ------------------------------- API ------------------------------- */

export function listInventory(
  token: string | null,
  query: InventoryListQuery = {},
): Promise<InventoryResult<Paginated<InventoryItem>>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.code) params.set('code', query.code.trim());
  if (query.keyword) params.set('keyword', query.keyword.trim());
  if (query.location) params.set('location', query.location.trim());
  if (query.orderCode) params.set('orderCode', query.orderCode.trim());
  if (query.storedFrom) params.set('storedFrom', query.storedFrom);
  if (query.storedTo) params.set('storedTo', query.storedTo);
  const qs = params.toString();
  return authorizedRequest<Paginated<InventoryItem>>(
    `/cms/inventory${qs ? `?${qs}` : ''}`,
    token,
  );
}

export function getInventoryItem(
  token: string | null,
  id: string,
): Promise<InventoryResult<InventoryItem>> {
  return authorizedRequest<InventoryItem>(`/cms/inventory/${encodeURIComponent(id)}`, token);
}

/** 某订单关联的库存（订单详情页展示） */
export function listOrderInventory(
  token: string | null,
  orderId: string,
): Promise<InventoryResult<InventoryItem[]>> {
  return authorizedRequest<InventoryItem[]>(
    `/cms/inventory/orders/${encodeURIComponent(orderId)}`,
    token,
  );
}

export function createInventory(
  token: string | null,
  input: InventoryInput,
): Promise<InventoryResult<InventoryItem>> {
  return authorizedRequest<InventoryItem>('/cms/inventory', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateInventory(
  token: string | null,
  id: string,
  input: InventoryInput,
): Promise<InventoryResult<InventoryItem>> {
  return authorizedRequest<InventoryItem>(`/cms/inventory/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteInventory(
  token: string | null,
  id: string,
): Promise<InventoryResult<{ id: string; code: string }>> {
  return authorizedRequest<{ id: string; code: string }>(
    `/cms/inventory/${encodeURIComponent(id)}`,
    token,
    { method: 'DELETE' },
  );
}

/* ------------------------------- 展示 ------------------------------- */

/**
 * 该订单的「主库存」= 最早创建的一条（createdAt 升序，同刻按 id 升序）。
 *
 * 与后端 OrdersService.update 的选择规则逐字一致：订单表单只回填/更新
 * 这一条，其余从库存列表额外新增的记录不受影响，避免一次保存误改多条。
 */
export function pickPrimaryInventory(items: InventoryItem[]): InventoryItem | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0];
}

/** 数量展示：保留必要小数位（最多三位），不带多余尾零 */
export function formatQuantity(quantity: string, unit: string): string {
  const value = Number(quantity);
  if (Number.isNaN(value)) return `${quantity} ${unit}`;
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 3 })} ${unit}`;
}
