'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { listMedia, type MediaAsset } from '@/lib/media';
import {
  createFactorySection,
  deleteFactorySection,
  updateFactorySection,
  type ContentStatus,
  type FactorySectionType,
} from '@/lib/enterprise';

/**
 * 工厂实力 CMS 服务端 Actions（Phase 4.5）。
 *
 * 令牌只存在于服务端：浏览器 JS 永远拿不到 JWT，所有写操作
 * 由服务端读取 HttpOnly Cookie 后转发给后端 /api/v1/cms/factory/**。
 */

export interface FactoryFormState {
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

function isStatus(value: string): value is ContentStatus {
  return value === 'DRAFT' || value === 'PUBLISHED';
}

function isSectionType(value: string): value is FactorySectionType {
  return (
    value === 'OVERVIEW' ||
    value === 'FACILITY' ||
    value === 'EQUIPMENT' ||
    value === 'PRODUCTION' ||
    value === 'LOADING' ||
    value === 'EXHIBITION'
  );
}

/** datetime-local（如 2026-10-15T15:30）→ ISO 8601；空值返回 null */
function toIsoOrNull(raw: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

interface FactoryImageInput {
  mediaId: string;
  altText?: string;
  sortOrder?: number;
}

interface FactoryExhibitionInput {
  id?: string;
  name: string;
  heldOn?: string;
  location?: string;
  description?: string;
  sortOrder?: number;
  isVisible?: boolean;
  photos?: FactoryImageInput[];
}

/** 解析隐藏字段中的 JSON（图库 / 展会结构）。失败返回错误原因。 */
function parseJson<T>(raw: string, fieldLabel: string): { ok: true; value: T } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] as unknown as T };
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, error: `${fieldLabel}数据格式不正确` };
  }
}

/**
 * 创建 / 更新工厂分区（id 为 null 时创建）。
 *
 * 表单始终提交图库与展会 JSON——留空数组即代表「清空」，
 * 与后端 PATCH 的整体替换语义一致。
 */
export async function saveFactorySectionAction(
  id: string | null,
  _prevState: FactoryFormState,
  formData: FormData,
): Promise<FactoryFormState> {
  const title = str(formData, 'title');
  const slug = str(formData, 'slug');

  if (!title || title.length < 2) return { ok: false, error: '请填写标题（至少 2 个字符）' };
  if (!slug) return { ok: false, error: '请填写 URL 标识（slug）' };

  const sectionType = str(formData, 'sectionType');
  if (!isSectionType(sectionType)) return { ok: false, error: '请选择内容类型' };

  const status = str(formData, 'status') || 'DRAFT';
  if (!isStatus(status)) return { ok: false, error: '发布状态不合法' };

  const images = parseJson<FactoryImageInput[]>(str(formData, 'imagesJson'), '图库');
  if (!images.ok) return { ok: false, error: images.error };

  const exhibitions = parseJson<FactoryExhibitionInput[]>(str(formData, 'exhibitionsJson'), '展会');
  if (!exhibitions.ok) return { ok: false, error: exhibitions.error };

  const body: Record<string, unknown> = {
    title,
    slug,
    sectionType,
    status,
    summary: str(formData, 'summary') || null,
    content: str(formData, 'content') || null,
    coverMediaId: str(formData, 'coverMediaId') || null,
    sortOrder: str(formData, 'sortOrder') ? Number(str(formData, 'sortOrder')) : 0,
    seoTitle: str(formData, 'seoTitle') || null,
    seoDescription: str(formData, 'seoDescription') || null,
    images: images.value,
    exhibitions: exhibitions.value,
  };

  const publishedAtRaw = str(formData, 'publishedAt');
  if (publishedAtRaw) {
    body.publishedAt = toIsoOrNull(publishedAtRaw);
  } else if (id) {
    body.publishedAt = null;
  }

  const token = await getSessionToken();
  const result = id
    ? await updateFactorySection(token, id, body)
    : await createFactorySection(token, body);

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/factory');
  if (id) revalidatePath(`/factory/${id}/edit`);
  return { ok: true, savedId: result.data.id };
}

/** 删除工厂分区（仅解除关联，不删除媒体） */
export async function deleteFactorySectionAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteFactorySection(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/factory');
  return { ok: true };
}

/* --------------------------- 媒体选择器数据源 --------------------------- */

export interface PickerResult {
  ok: boolean;
  items: MediaAsset[];
  total: number;
  totalPages: number;
  error?: string;
}

/**
 * 为媒体验选择器拉取媒体库列表（工厂模块不自行上传文件）。
 * category 传 'DOCUMENT' 可只看 PDF 等文档。
 */
export async function fetchMediaForFactory(
  page = 1,
  keyword = '',
  category?: 'IMAGE' | 'DOCUMENT',
): Promise<PickerResult> {
  const token = await getSessionToken();
  const result = await listMedia(token, {
    page,
    limit: 24,
    keyword: keyword.trim() || undefined,
    category,
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
