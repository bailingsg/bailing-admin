'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  deleteContact,
  removeContactAvatar,
  setContactVisibility,
  uploadContactAvatar,
  upsertContact,
  type Contact,
  type UpsertContactInput,
} from '@/lib/rbac';
// 常量不能在 'use server' 文件里导出（构建会报错），统一放在 avatar.ts
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from './avatar';

/**
 * 员工联系方式 —— 服务端 Actions（Phase 4.6）。
 *
 * adminUserId 只接受系统中真实存在且启用的员工账号（后端强制，防幽灵员工）；
 * 内部备注（internalNote）仅后台可见，公开接口不会返回。
 */

/**
 * 头像允许的格式与体积见同目录 `avatar.ts`（'use server' 文件只能导出
 * async 函数，常量若在导出会导致构建失败）。
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

/**
 * 上传 / 替换头像（multipart，字段名 file）。
 *
 * 注意：**不能**在这里把 File 转成 base64 再发 JSON——接口只认 multipart。
 * 服务端 Action 直接把 FormData 透传给 fetch，由 fetch 生成 boundary。
 */
export async function uploadContactAvatarAction(
  id: string,
  formData: FormData,
): Promise<ApiResult<Contact>> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '请选择要上传的头像文件', status: 0 };
  }
  if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
    return { ok: false, error: `不支持的头像格式：${file.type || '未知'}（仅支持 JPEG / PNG / WebP / AVIF）`, status: 0 };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: `头像不能超过 ${Math.floor(AVATAR_MAX_BYTES / 1024 / 1024)}MB`, status: 0 };
  }

  const token = await getSessionToken();
  const result = await uploadContactAvatar(id, token, formData);
  if (!result.ok) return result;

  revalidatePath('/contacts');
  return result;
}

/** 移除头像（后端同步删除存储对象） */
export async function removeContactAvatarAction(id: string): Promise<ApiResult<Contact>> {
  const token = await getSessionToken();
  const result = await removeContactAvatar(token, id);
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
