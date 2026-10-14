/**
 * 管理后台 —— Products/Categories CMS API 访问层（服务端）。
 *
 * 全部走 HttpOnly Cookie 中的 JWT（Authorization: Bearer 转发给后端
 * /api/v1/cms/** 接口，均受 JwtAuthGuard 保护）。
 * 上传图片使用独立函数：不设置 Content-Type，由 fetch 自动生成
 * multipart boundary。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 类型 ------------------------------- */

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const PRODUCT_STATUSES: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CmsProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface CmsProductListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  category: { id: string; name: string; slug: string } | null;
  primaryImage: CmsProductImage | null;
  imageCount: number;
  updatedAt: string;
}

export interface CmsProductDetail {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  shortDescription: string | null;
  description: string;
  material: string | null;
  application: string | null;
  applications: string[];
  specifications: Record<string, string> | null;
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  images: CmsProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProducts {
  items: CmsProductListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: ProductStatus;
  categoryId?: string;
}

/* ------------------------------- 分类 ------------------------------- */

/** 分类列表（含各分类产品计数） */
export function listCategories(token: string | null): Promise<ApiResult<CmsCategory[]>> {
  return authorizedRequest<CmsCategory[]>('/cms/product-categories', token);
}

/** 创建分类 */
export function createCategory(
  token: string | null,
  body: { name: string; slug: string; description?: string; sortOrder?: number; isActive?: boolean },
): Promise<ApiResult<CmsCategory>> {
  return authorizedRequest<CmsCategory>('/cms/product-categories', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 更新分类（PATCH：仅传提供的字段） */
export function updateCategory(
  token: string | null,
  id: string,
  body: { name?: string; slug?: string; description?: string; sortOrder?: number; isActive?: boolean },
): Promise<ApiResult<CmsCategory>> {
  return authorizedRequest<CmsCategory>(`/cms/product-categories/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 删除分类（分类下有产品时后端返回 400） */
export function deleteCategory(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/product-categories/${id}`, token, {
    method: 'DELETE',
  });
}

/* ------------------------------- 产品 ------------------------------- */

/** 产品列表（分页 + keyword/status/categoryId 筛选） */
export function listProducts(
  token: string | null,
  params: ListProductsParams = {},
): Promise<ApiResult<PaginatedProducts>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.status) search.set('status', params.status);
  if (params.categoryId) search.set('categoryId', params.categoryId);
  const query = search.toString();
  return authorizedRequest<PaginatedProducts>(`/cms/products${query ? `?${query}` : ''}`, token);
}

/** 产品详情（编辑页数据源） */
export function getProduct(token: string | null, id: string): Promise<ApiResult<CmsProductDetail>> {
  return authorizedRequest<CmsProductDetail>(`/cms/products/${id}`, token);
}

/** 创建产品 */
export function createProduct(
  token: string | null,
  body: Record<string, unknown>,
): Promise<ApiResult<CmsProductDetail>> {
  return authorizedRequest<CmsProductDetail>('/cms/products', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 更新产品（PATCH） */
export function updateProduct(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResult<CmsProductDetail>> {
  return authorizedRequest<CmsProductDetail>(`/cms/products/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 删除产品（后端级联删除图片行并清理磁盘文件） */
export function deleteProduct(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/products/${id}`, token, { method: 'DELETE' });
}

/* ------------------------------- 图片 ------------------------------- */

/**
 * 上传产品图片（multipart/form-data）。
 *
 * 独立于 authorizedRequest：绝不能预设 Content-Type（会破坏 boundary），
 * 也不能走 init.headers 覆盖——Headers 由 fetch 依据 FormData 自动生成。
 */
export async function uploadProductImage(
  productId: string,
  token: string | null,
  formData: FormData,
): Promise<ApiResult<CmsProductImage>> {
  const API_BASE = (
    process.env.ADMIN_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://127.0.0.1:4000/api/v1'
  ).replace(/\/$/, '');

  try {
    const response = await fetch(`${API_BASE}/cms/products/${productId}/images`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await response.json().catch(() => null)) as {
      success: boolean;
      data?: CmsProductImage;
      error?: { message?: string | string[] };
    } | null;

    if (!response.ok || !json || json.success !== true || !json.data) {
      const message = json?.error?.message;
      return {
        ok: false,
        error: Array.isArray(message)
          ? message.join('；')
          : (message ?? `上传失败（HTTP ${response.status}）`),
        status: response.status,
      };
    }
    return { ok: true, data: json.data };
  } catch (error) {
    return { ok: false, error: `无法连接后端接口：${(error as Error).message}`, status: 0 };
  }
}

/** 删除产品图片 */
export function deleteProductImage(
  token: string | null,
  productId: string,
  imageId: string,
): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(
    `/cms/products/${productId}/images/${imageId}`,
    token,
    { method: 'DELETE' },
  );
}
