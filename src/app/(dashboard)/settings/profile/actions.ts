'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  changeMyPassword,
  removeMyAvatar,
  updateMyProfile,
  uploadMyAvatar,
  type ApiResult,
  type MyProfile,
  type UpdateMyProfileInput,
} from '@/lib/api';
import { AVATAR_MIME_TYPES, AVATAR_MAX_BYTES } from '@/lib/avatar';

/**
 * 账号设置 —— 自助维护（服务端 Actions）。
 *
 * 后端 /auth/profile、/auth/profile/avatar、/auth/change-password 只认 JWT 里的
 * 本人身份（不接受 adminUserId），因此这里**不需要**任何权限判断：
 * 任何登录员工都能改自己的资料/头像/口令，但改不到别人。
 */

/** 自助修改我的资料（姓名 / 登录邮箱 / 职位 / 官网展示联系方式） */
export async function updateMyProfileAction(
  input: UpdateMyProfileInput,
): Promise<ApiResult<MyProfile>> {
  const token = await getSessionToken();
  const result = await updateMyProfile(token, input);
  if (!result.ok) return result;

  // 顶栏显示邮箱/姓名，改完要刷新布局
  revalidatePath('/settings/profile');
  return result;
}

/**
 * 上传 / 替换我的头像（multipart，字段名 file）。
 *
 * 前端先做格式与体积预检（后端仍会再校验 MIME + 魔数，双保险）。
 * 服务端 Action 直接把 FormData 透传给 fetch，由 fetch 生成 boundary——
 * **不能**转 base64 走 JSON，接口只认 multipart。
 *
 * 后端替换时会删除服务器上的旧头像对象，前端无需额外清理。
 */
export async function uploadMyAvatarAction(
  formData: FormData,
): Promise<ApiResult<MyProfile>> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '请选择要上传的头像文件', status: 0 };
  }
  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: `不支持的头像格式：${file.type || '未知'}（仅支持 JPEG / PNG / WebP / AVIF）`,
      status: 0,
    };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      error: `头像不能超过 ${Math.floor(AVATAR_MAX_BYTES / 1024 / 1024)}MB`,
      status: 0,
    };
  }

  const token = await getSessionToken();
  const result = await uploadMyAvatar(token, formData);
  if (!result.ok) return result;

  revalidatePath('/settings/profile');
  return result;
}

/** 移除我的头像（后端同步删除存储对象） */
export async function removeMyAvatarAction(): Promise<ApiResult<MyProfile>> {
  const token = await getSessionToken();
  const result = await removeMyAvatar(token);
  if (!result.ok) return result;

  revalidatePath('/settings/profile');
  return result;
}

/** 自助修改登录口令（必须提供当前口令） */
export async function changeMyPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResult<{ changed: true }>> {
  if (input.newPassword.length < 8) {
    return { ok: false, error: '新口令至少 8 位', status: 0 };
  }
  if (input.newPassword === input.currentPassword) {
    return { ok: false, error: '新口令不能与当前口令相同', status: 0 };
  }

  const token = await getSessionToken();
  return changeMyPassword(token, input);
}
