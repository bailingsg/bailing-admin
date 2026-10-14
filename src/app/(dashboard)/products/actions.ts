'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  updateProduct,
  uploadProductImage,
  type ProductStatus,
} from '@/lib/products';

/**
 * Products CMS 服务端 Actions（Phase 4.2）。
 *
 * 令牌只存在于服务端：浏览器 JS 永远拿不到 JWT，所有写操作
 * 由服务端读取 HttpOnly Cookie 后转发给后端 /api/v1/cms/**。
 */

export interface ProductFormState {
  ok: boolean;
  error?: string;
  /** 保存成功后的产品 ID（供跳转编辑页） */
  savedId?: string;
}

/** 读取字符串字段并去空白 */
function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** 解析 applications 隐藏字段（TagInput 写入的 JSON 数组） */
function parseApplications(raw: string): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== 'string')) {
      return { ok: false, error: '应用标签格式不正确' };
    }
    return { ok: true, value: parsed as string[] };
  } catch {
    return { ok: false, error: '应用标签格式不正确' };
  }
}

/** 解析 specifications 文本框（JSON 对象；空内容视为未提供） */
function parseSpecifications(
  raw: string,
): { ok: true; value: Record<string, string> | undefined } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: undefined };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: '规格参数必须是 JSON 对象，例如 {"thickness":"18mm"}' };
    }
    const entries = Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === 'string' ? v : String(v),
    ]);
    return { ok: true, value: Object.fromEntries(entries) as Record<string, string> };
  } catch {
    return { ok: false, error: '规格参数不是合法的 JSON' };
  }
}

function isStatus(value: string): value is ProductStatus {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED';
}

/**
 * 创建 / 更新产品（id 为 null 时创建）。
 * 与 ProductForm 客户端组件配合（useActionState）。
 */
export async function saveProductAction(
  id: string | null,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const name = str(formData, 'name');
  const slug = str(formData, 'slug');
  const categoryId = str(formData, 'categoryId');
  const description = str(formData, 'description');

  if (!name || !slug || !categoryId || !description) {
    return { ok: false, error: '请填写产品名称、URL 标识、分类与详细描述' };
  }

  const applications = parseApplications(str(formData, 'applicationsJson'));
  if (!applications.ok) return { ok: false, error: applications.error };

  const specifications = parseSpecifications(str(formData, 'specifications'));
  if (!specifications.ok) return { ok: false, error: specifications.error };

  const status = str(formData, 'status') || 'DRAFT';
  if (!isStatus(status)) return { ok: false, error: '产品状态不合法' };

  const body: Record<string, unknown> = {
    name,
    slug,
    categoryId,
    description,
    status,
    isFeatured: formData.get('isFeatured') === 'on',
  };

  const shortDescription = str(formData, 'shortDescription');
  if (shortDescription) body.shortDescription = shortDescription;
  const material = str(formData, 'material');
  if (material) body.material = material;
  if (applications.value.length > 0) body.applications = applications.value;
  if (specifications.value) body.specifications = specifications.value;
  const seoTitle = str(formData, 'seoTitle');
  if (seoTitle) body.seoTitle = seoTitle;
  const seoDescription = str(formData, 'seoDescription');
  if (seoDescription) body.seoDescription = seoDescription;

  const token = await getSessionToken();
  const result = id
    ? await updateProduct(token, id, body)
    : await createProduct(token, body);

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/products');
  if (id) revalidatePath(`/products/${id}/edit`);
  return { ok: true, savedId: result.data.id };
}

/** 删除产品（级联清理图片行与磁盘文件由后端完成） */
export async function deleteProductAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const token = await getSessionToken();
  const result = await deleteProduct(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/products');
  return { ok: true };
}

/** 上传产品图片（multipart，file 字段由表单提供） */
export async function uploadProductImageAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '请选择要上传的图片文件' };
  }

  const token = await getSessionToken();
  const result = await uploadProductImage(productId, token, formData);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/products/${productId}/edit`);
  return { ok: true, savedId: productId };
}

/** 删除产品图片 */
export async function deleteProductImageAction(
  productId: string,
  imageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = await getSessionToken();
  const result = await deleteProductImage(token, productId, imageId);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/products/${productId}/edit`);
  return { ok: true };
}
