'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { createSeoRedirect, deleteSeoRedirect, updateSeoRedirect } from '@/lib/seo';

/**
 * 重定向管理 Actions（Phase 5.0，任务书二十八节）。
 * 后端强制：禁止自指向 / 成环 / 重复 source / 危险协议。
 */

export interface RedirectFormState {
  ok: boolean;
  error?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** 新建重定向（默认 301） */
export async function createRedirectAction(
  _prevState: RedirectFormState,
  formData: FormData,
): Promise<RedirectFormState> {
  const token = await getSessionToken();
  const result = await createSeoRedirect(token, {
    sourcePath: str(formData, 'sourcePath'),
    targetPath: str(formData, 'targetPath'),
    statusCode: str(formData, 'statusCode') === '302' ? 302 : 301,
    note: str(formData, 'note') || undefined,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath('/seo/redirects');
  return { ok: true };
}

/** 更新 / 停用重定向 */
export async function updateRedirectAction(
  id: string,
  _prevState: RedirectFormState,
  formData: FormData,
): Promise<RedirectFormState> {
  const token = await getSessionToken();
  const result = await updateSeoRedirect(token, id, {
    targetPath: str(formData, 'targetPath') || undefined,
    statusCode: str(formData, 'statusCode') === '302' ? 302 : 301,
    isActive: formData.get('isActive') === 'on',
    note: str(formData, 'note') || undefined,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath('/seo/redirects');
  return { ok: true };
}

/** 删除重定向 */
export async function deleteRedirectAction(id: string): Promise<RedirectFormState> {
  const token = await getSessionToken();
  const result = await deleteSeoRedirect(token, id);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath('/seo/redirects');
  return { ok: true };
}
