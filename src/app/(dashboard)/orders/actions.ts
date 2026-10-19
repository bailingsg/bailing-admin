'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  createOrder,
  updateOrder,
  type OrderInput,
  type OrderItem,
  type OrderUpdateInput,
} from '@/lib/orders';

/**
 * 订单管理 —— 服务端 Actions（Phase 5.2 / 5.3.2）。
 *
 * 照片上传不走本文件：上传由客户端直传 /api/order-photos/upload 代理
 * （XHR 以便展示进度），创建/更新时只提交已拿到的附件 ID。
 * 权限判定全部在后端；这里仅携带 HttpOnly Cookie 中的 JWT 并刷新缓存。
 *
 * Phase 5.3.2：订单表单可内联库存，因此创建/更新后同时失效库存列表缓存。
 */

export async function createOrderAction(
  input: OrderInput,
): Promise<ApiResult<OrderItem>> {
  const token = await getSessionToken();
  const result = await createOrder(token, input);
  if (!result.ok) return result;
  revalidatePath('/orders');
  revalidatePath('/inventory');
  return result;
}

export async function updateOrderAction(
  id: string,
  input: OrderUpdateInput,
): Promise<ApiResult<OrderItem>> {
  const token = await getSessionToken();
  const result = await updateOrder(token, id, input);
  if (!result.ok) return result;
  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
  revalidatePath('/inventory');
  return result;
}
