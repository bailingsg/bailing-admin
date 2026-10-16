'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  deleteContact,
  setContactVisibility,
  upsertContact,
  type Contact,
  type UpsertContactInput,
} from '@/lib/rbac';

/**
 * 员工联系方式 —— 服务端 Actions（Phase 4.6）。
 *
 * adminUserId 只接受系统中真实存在且启用的员工账号（后端强制，防幽灵员工）；
 * 内部备注（internalNote）仅后台可见，公开接口不会返回。
 */

/** 创建 / 更新联系方式（每个员工一条，按 adminUserId 幂等） */
export async function upsertContactAction(
  input: UpsertContactInput,
): Promise<ApiResult<Contact>> {
  const token = await getSessionToken();
  const result = await upsertContact(token, input);
  if (!result.ok) return result;

  revalidatePath('/contacts');
  return result;
}

/** 切换公开展示 */
export async function setContactVisibilityAction(
  id: string,
  showOnSite: boolean,
): Promise<ApiResult<Contact>> {
  const token = await getSessionToken();
  const result = await setContactVisibility(token, id, showOnSite);
  if (!result.ok) return result;

  revalidatePath('/contacts');
  return result;
}

/** 删除联系方式（仅解除绑定，不影响员工账号本身） */
export async function deleteContactAction(id: string): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await deleteContact(token, id);
  if (!result.ok) return result;

  revalidatePath('/contacts');
  return result;
}
