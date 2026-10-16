'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  createNavItem,
  deleteNavItem,
  updateNavItem,
  type NavLocation,
} from '@/lib/rbac';

/**
 * 站内导航管理服务端 Actions（Phase 4.7）。
 *
 * 令牌只存在于服务端；后端对 url 做强制安全校验
 * （仅站内相对路径 / https / mailto / tel），前端提示只是体验优化。
 */

export interface NavFormState {
  ok: boolean;
  error?: string;
  savedId?: string;
}

export interface SimpleFormState {
  ok: boolean;
  error?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isLocation(value: string): value is NavLocation {
  return value === 'HEADER' || value === 'FOOTER';
}

function num(formData: FormData, key: string): number | undefined {
  const raw = str(formData, key);
  if (raw === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

/** 创建 / 更新导航项（id 为 null 时创建） */
export async function saveNavItemAction(
  id: string | null,
  _prevState: NavFormState,
  formData: FormData,
): Promise<NavFormState> {
  const token = await getSessionToken();

  const location = str(formData, 'location');
  if (!isLocation(location)) {
    return { ok: false, error: '请选择合法的位置（页眉 / 页脚）' };
  }

  const label = str(formData, 'label');
  if (label === '') {
    return { ok: false, error: '导航文案不能为空' };
  }

  const url = str(formData, 'url');
  if (url === '') {
    return { ok: false, error: '链接不能为空' };
  }

  const input = {
    location,
    label,
    url,
    sortOrder: num(formData, 'sortOrder'),
    isActive: id === null ? true : undefined,
    openInNewTab: bool(formData, 'openInNewTab'),
  };

  if (id === null) {
    const result = await createNavItem(token, input);
    if (!result.ok) {
      return { ok: false, error: result.error ?? '创建失败' };
    }
    revalidatePath('/navigation');
    return { ok: true, savedId: result.data.id };
  }

  const result = await updateNavItem(token, id, {
    label,
    url,
    sortOrder: num(formData, 'sortOrder'),
    isActive: bool(formData, 'isActive'),
    openInNewTab: bool(formData, 'openInNewTab'),
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? '保存失败' };
  }
  revalidatePath('/navigation');
  return { ok: true, savedId: result.data.id };
}

/** 删除导航项 */
export async function deleteNavItemAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteNavItem(token, id);
  if (!result.ok) {
    return { ok: false, error: result.error ?? '删除失败' };
  }
  revalidatePath('/navigation');
  return { ok: true };
}

/** 快捷启用 / 停用 */
export async function setNavItemActiveAction(
  id: string,
  isActive: boolean,
): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await updateNavItem(token, id, { isActive });
  if (!result.ok) {
    return { ok: false, error: result.error ?? '状态更新失败' };
  }
  revalidatePath('/navigation');
  return { ok: true };
}
