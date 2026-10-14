'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { createCategory, deleteCategory, updateCategory } from '@/lib/products';

/**
 * 产品分类管理服务端 Actions（Phase 4.2）。
 */

export interface CategoryFormState {
  ok: boolean;
  error?: string;
}

/** 创建分类 */
export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const sortOrder = Number.parseInt(String(formData.get('sortOrder') ?? '0'), 10);
  const isActive = formData.get('isActive') === 'on';

  if (!name || !slug) {
    return { ok: false, error: '请填写分类名称与 slug' };
  }

  const token = await getSessionToken();
  const result = await createCategory(token, {
    name,
    slug,
    ...(description ? { description } : {}),
    ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
    isActive,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/categories');
  return { ok: true };
}

/** 更新分类（PATCH） */
export async function updateCategoryAction(
  id: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const sortOrder = Number.parseInt(String(formData.get('sortOrder') ?? '0'), 10);
  const isActive = formData.get('isActive') === 'on';

  if (!name || !slug) {
    return { ok: false, error: '请填写分类名称与 slug' };
  }

  const token = await getSessionToken();
  const result = await updateCategory(token, id, {
    name,
    slug,
    description,
    ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
    isActive,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/categories');
  return { ok: true };
}

/** 删除分类（分类下有产品时后端返回 400） */
export async function deleteCategoryAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const token = await getSessionToken();
  const result = await deleteCategory(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/categories');
  return { ok: true };
}
