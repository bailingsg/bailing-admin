'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  updateMyProfile,
  type ApiResult,
  type MyProfile,
  type UpdateMyProfileInput,
} from '@/lib/api';

/**
 * 账号设置 —— 自助修改我的资料（服务端 Action）。
 *
 * 后端 PATCH /auth/profile 只认 JWT 里的本人身份（不接受 adminUserId），
 * 因此这里**不需要**任何权限判断：任何登录员工都能改自己的资料，
 * 但改不到别人。
 */
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
