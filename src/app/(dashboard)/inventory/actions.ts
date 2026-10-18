'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  createInventory,
  deleteInventory,
  updateInventory,
  type InventoryInput,
} from '@/lib/inventory';

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function messageOf(fallback: string, error: string): string {
  if (error.includes('该订单号已存在')) return error;
  return error || fallback;
}

export async function createInventoryAction(
  input: InventoryInput,
): Promise<ActionResult> {
  const token = await getSessionToken();
  const result = await createInventory(token, input);
  if (!result.ok) {
    return { ok: false, error: messageOf('新增库存失败，请检查输入', result.error) };
  }
  revalidatePath('/inventory');
  return { ok: true, id: result.data.id };
}

export async function updateInventoryAction(
  id: string,
  input: InventoryInput,
): Promise<ActionResult> {
  const token = await getSessionToken();
  const result = await updateInventory(token, id, input);
  if (!result.ok) {
    return { ok: false, error: messageOf('保存失败，请检查输入', result.error) };
  }
  revalidatePath('/inventory');
  revalidatePath(`/inventory/${id}`);
  return { ok: true, id };
}

export async function deleteInventoryAction(id: string): Promise<ActionResult> {
  const token = await getSessionToken();
  const result = await deleteInventory(token, id);
  if (!result.ok) {
    return { ok: false, error: result.error || '删除失败' };
  }
  revalidatePath('/inventory');
  return { ok: true, id };
}
