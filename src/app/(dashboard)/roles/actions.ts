'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getPermissionMatrix,
  updateRole,
  type CreateRoleInput,
  type CreateRoleResult,
  type PermissionMatrix,
  type RoleDetail,
  type UpdateRoleInput,
} from '@/lib/rbac';

/**
 * 角色与权限 —— 服务端 Actions（Phase 4.6）。
 *
 * 权限矩阵来自后端代码注册表（与 PermissionsGuard 同源），前端分组展示；
 * 保存权限时后端会校验「不得超出操作人自身权限范围」，提权请求一律 403。
 */

/** 权限矩阵（模块分组，含功能权限与导航权限标记） */
export async function fetchPermissionMatrixAction(): Promise<ApiResult<PermissionMatrix>> {
  const token = await getSessionToken();
  return getPermissionMatrix(token);
}

/** 创建角色（默认不带任何权限，需在角色详情中显式分配） */
export async function createRoleAction(
  input: CreateRoleInput,
): Promise<ApiResult<CreateRoleResult>> {
  const token = await getSessionToken();
  const result = await createRole(token, input);
  if (!result.ok) return result;

  revalidatePath('/roles');
  return result;
}

/** 更新角色（名称 / 描述 / 状态 / 排序） */
export async function updateRoleAction(
  id: string,
  input: UpdateRoleInput,
): Promise<ApiResult<RoleDetail>> {
  const token = await getSessionToken();
  const result = await updateRole(token, id, input);
  if (!result.ok) return result;

  revalidatePath('/roles');
  revalidatePath(`/roles/${id}`);
  return result;
}

/** 删除角色（受保护或仍有关联账号的角色会被后端拒绝） */
export async function deleteRoleAction(id: string): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await deleteRole(token, id);
  if (!result.ok) return result;

  revalidatePath('/roles');
  revalidatePath(`/roles/${id}`);
  return result;
}

/** 覆盖式保存角色权限（PUT 语义：以提交列表为准） */
export async function assignRolePermissionsAction(
  id: string,
  permissions: string[],
): Promise<ApiResult<RoleDetail>> {
  const token = await getSessionToken();
  const result = await assignRolePermissions(token, id, permissions);
  if (!result.ok) return result;

  revalidatePath('/roles');
  revalidatePath(`/roles/${id}`);
  return result;
}
