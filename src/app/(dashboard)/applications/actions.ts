'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { listMedia, type MediaAsset } from '@/lib/media';
import { listProducts, type CmsProductListItem } from '@/lib/products';
import { createApplication, deleteApplication, updateApplication } from '@/lib/enterprise';

/**
 * 产品应用场景 CMS 服务端 Actions（Phase 4.5）。
 *
 * 令牌只存在于服务端：所有写操作由服务端读取 HttpOnly Cookie 后
 * 转发给后端 /api/v1/cms/applications/**。
 *
 * 关联产品通过显式多对多（ApplicationProduct）建立——不使用名称字符串匹配。
 */

export interface ApplicationFormState {
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

/** 解析隐藏字段中的产品 ID 数组 JSON */
function parseIdArray(raw: string): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== 'string')) {
      return { ok: false, error: '关联产品数据格式不正确' };
    }
    return { ok: true, value: parsed as string[] };
  } catch {
    return { ok: false, error: '关联产品数据格式不正确' };
  }
}

/** 创建 / 更新应用场景（id 为 null 时创建） */
export async function saveApplicationAction(
  id: string | null,
  _prevState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const name = str(formData, 'name');
  const slug = str(formData, 'slug');

  if (!name || name.length < 2) return { ok: false, error: '请填写场景名称（至少 2 个字符）' };
  if (!slug) return { ok: false, error: '请填写 URL 标识（slug）' };

  const productIds = parseIdArray(str(formData, 'productIdsJson'));
  if (!productIds.ok) return { ok: false, error: productIds.error };

  // Phase 1：不再提交 status / publishedAt——发布态只能经「发布 / 取消发布」变更
  const body: Record<string, unknown> = {
    name,
    slug,
    summary: str(formData, 'summary') || null,
    description: str(formData, 'description') || null,
    coverMediaId: str(formData, 'coverMediaId') || null,
    featured: formData.get('featured') === 'on',
    sortOrder: str(formData, 'sortOrder') ? Number(str(formData, 'sortOrder')) : 0,
    seoTitle: str(formData, 'seoTitle') || null,
    seoDescription: str(formData, 'seoDescription') || null,
    // 整体替换关联产品集合
    products: productIds.value.map((productId, index) => ({ productId, sortOrder: index })),
  };

  const token = await getSessionToken();
  const result = id ? await updateApplication(token, id, body) : await createApplication(token, body);

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/applications');
  if (id) revalidatePath(`/applications/${id}/edit`);
  return { ok: true, savedId: result.data.id };
}

/** 删除应用场景（仅解除产品关联，不删除产品） */
export async function deleteApplicationAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteApplication(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/applications');
  return { ok: true };
}

/* --------------------------- 媒体 / 产品选择器数据源 --------------------------- */

export interface PickerResult {
  ok: boolean;
  items: MediaAsset[];
  total: number;
  totalPages: number;
  error?: string;
}

/** 拉取媒体库列表（应用场景不自行上传文件） */
export async function fetchMediaForApplication(page = 1, keyword = ''): Promise<PickerResult> {
  const token = await getSessionToken();
  const result = await listMedia(token, {
    page,
    limit: 24,
    keyword: keyword.trim() || undefined,
    category: 'IMAGE',
  });

  if (!result.ok) {
    return { ok: false, items: [], total: 0, totalPages: 0, error: result.error };
  }
  return {
    ok: true,
    items: result.data.items,
    total: result.data.total,
    totalPages: result.data.totalPages,
  };
}

export interface ProductPickerResult {
  ok: boolean;
  items: CmsProductListItem[];
  total: number;
  totalPages: number;
  error?: string;
}

/** 搜索产品（供关联产品选择器使用） */
export async function searchProductsForApplication(
  page = 1,
  keyword = '',
): Promise<ProductPickerResult> {
  const token = await getSessionToken();
  const result = await listProducts(token, {
    page,
    limit: 20,
    keyword: keyword.trim() || undefined,
  });

  if (!result.ok) {
    return { ok: false, items: [], total: 0, totalPages: 0, error: result.error };
  }
  return {
    ok: true,
    items: result.data.items,
    total: result.data.total,
    totalPages: result.data.totalPages,
  };
}
