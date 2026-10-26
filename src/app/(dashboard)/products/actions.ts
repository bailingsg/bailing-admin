'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  updateProduct,
  uploadProductImage,
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

/** 简短描述上限（与后端 DTO 的 @MaxLength(100) 一致） */
const SHORT_DESCRIPTION_MAX = 100;

/**
 * 富文本可见文字长度。
 *
 * contentEditable 的空态不是空串：可能是 `<br>`、`<div><br></div>` 或
 * 一串空段落。直接看 HTML 长度会把「视觉上空的编辑器」判为合法内容，
 * 因此校验必须基于去标签后的可见文字。
 */
function richTextVisibleLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, '') // 去标签
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim().length;
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

/**
 * 创建 / 更新产品（id 为 null 时创建）。
 * 与 ProductForm 客户端组件配合（useActionState）。
 *
 * Phase 1：**不再提交 status**。创建恒为草稿；已发布产品的保存写入编辑稿，
 * 上线只能经发布面板（独立权限 products.publish）。
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
  const shortDescription = str(formData, 'shortDescription');

  if (!name || !slug || !categoryId) {
    return { ok: false, error: '请填写产品名称、URL 标识与分类' };
  }

  // 详细描述：按富文本的「可见文字」判定，避免空编辑器里的 <br>/空段落蒙混过关
  if (richTextVisibleLength(description) < 10) {
    return { ok: false, error: '详细描述至少需要 10 个字（不含格式）' };
  }

  // 简短描述：前置拦截，给出比后端 400 更明确的中文提示
  if (shortDescription.length > SHORT_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `简短描述最多 ${SHORT_DESCRIPTION_MAX} 字，当前 ${shortDescription.length} 字，请精简后再保存`,
    };
  }

  const applications = parseApplications(str(formData, 'applicationsJson'));
  if (!applications.ok) return { ok: false, error: applications.error };

  const specifications = parseSpecifications(str(formData, 'specifications'));
  if (!specifications.ok) return { ok: false, error: specifications.error };

  /*
   * 可选字段的空值语义（BUG-02 修复）：
   * 产品表单始终渲染这些输入框，因此「空串」代表用户**明确清空**，
   * 必须写进请求体（null）才能落库；而字段整个缺失（formData.has 为 false）
   * 表示本次请求不涉及该字段，保持原值不动。
   *
   * 旧写法 `if (shortDescription) body.shortDescription = ...` 把空串当 falsy
   * 跳过，导致清空后刷新旧值回填。清空时发 null 而不是 ''，是为了保持
   * 「未设置」的原始语义——前台多处用 `?? 兜底` 取值，'' 会顶掉兜底值。
   */
  const body: Record<string, unknown> = {
    name,
    slug,
    categoryId,
    description,
    isFeatured: formData.get('isFeatured') === 'on',
  };

  if (formData.has('shortDescription')) body.shortDescription = shortDescription || null;
  if (formData.has('material')) body.material = str(formData, 'material') || null;
  // 标签全删 = 空数组（后端 IsApplicationsConstraint 允许空数组）
  if (formData.has('applicationsJson')) body.applications = applications.value;
  if (formData.has('specifications')) body.specifications = specifications.value ?? null;
  if (formData.has('seoTitle')) body.seoTitle = str(formData, 'seoTitle') || null;
  if (formData.has('seoDescription')) body.seoDescription = str(formData, 'seoDescription') || null;

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

  /*
   * 只转发后端 AddProductImageDto 声明的业务字段，不能透传 action 收到的 FormData。
   *
   * `<form action={formAction}>` 提交时，Next.js 会往 FormData 里注入
   * `$ACTION_ID_*` / `$ACTION_REF_*` / `$ACTION_KEY` 等内部字段；后端全局
   * ValidationPipe 开了 `forbidNonWhitelisted`，会把它们当未声明字段整体 400
   * （报错即 "property $ACTION_REF_1 should not exist"）。
   *
   * 媒体库与联系人头像上传之所以正常，是因为它们手工构造了干净的 FormData。
   */
  const payload = new FormData();
  payload.append('file', file, file.name);

  const alt = str(formData, 'alt');
  if (alt) payload.append('alt', alt);

  const sortOrder = str(formData, 'sortOrder');
  if (sortOrder) payload.append('sortOrder', sortOrder);

  /*
   * 复选框只在勾选时提交（值固定为 "on"，后端 toBool 不识别该字面量，
   * 这里归一化成 "true"）。未勾选时不传，交给后端按「首图自动设主图」处理，
   * 传 false 会覆盖掉这条业务规则。
   */
  if (formData.get('isPrimary') === 'on') payload.append('isPrimary', 'true');

  const token = await getSessionToken();
  const result = await uploadProductImage(productId, token, payload);
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
