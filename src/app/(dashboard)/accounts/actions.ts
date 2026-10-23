'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  createAccount,
  listAssignableRoles,
  resetAccountPassword,
  setAccountStatus,
  updateAccount,
  type AccountDetail,
  type AssignableRole,
  type CreateAccountInput,
  type CreateAccountResult,
  type ResetPasswordResult,
  type UpdateAccountInput,
} from '@/lib/rbac';

/**
 * 账号管理 —— 服务端 Actions（Phase 4.6）。
 *
 * 令牌只存在于服务端：客户端表单 / 两步确认按钮调用这里的 Action，
 * 由服务端读取 HttpOnly Cookie 中的 JWT 后转发到后端 /api/v1/cms/accounts/**。
 *
 * 权限校验与提权防护全部发生在后端（PermissionsGuard + 角色可分配校验），
 * 前端只负责「有没有权限渲染入口」。
 */

/** 可分配角色（操作人无权分配的角色会在返回中标记 assignable=false） */
export async function fetchAssignableRolesAction(): Promise<ApiResult<AssignableRole[]>> {
  const token = await getSessionToken();
  return listAssignableRoles(token);
}

/** 创建账号（初始口令仅在创建响应中返回一次） */
export async function createAccountAction(
  input: CreateAccountInput,
): Promise<ApiResult<CreateAccountResult>> {
  const token = await getSessionToken();
  const result = await createAccount(token, input);
  if (!result.ok) return result;

  revalidatePath('/accounts');
  return result;
}

/** 更新账号（邮箱 / 姓名 / 职位 / 小满·阿里账号 / 角色） */
export async function updateAccountAction(
  id: string,
  input: UpdateAccountInput,
): Promise<ApiResult<AccountDetail>> {
  const token = await getSessionToken();
  const result = await updateAccount(token, id, input);
  if (!result.ok) return result;

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${id}/edit`);
  return result;
}

/** 启用 / 停用账号（两步确认由调用方完成） */
export async function setAccountStatusAction(
  id: string,
  isActive: boolean,
): Promise<ApiResult<AccountDetail>> {
  const token = await getSessionToken();
  const result = await setAccountStatus(token, id, isActive);
  if (!result.ok) return result;

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${id}/edit`);
  return result;
}

/** 重置口令：新口令明文仅在响应中返回一次，之后不可再取 */
export async function resetPasswordAction(
  id: string,
  newPassword?: string,
): Promise<ApiResult<ResetPasswordResult>> {
  const token = await getSessionToken();
  return resetAccountPassword(token, id, newPassword);
}
