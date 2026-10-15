'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { listMedia, type MediaAsset } from '@/lib/media';
import {
  createQualityRecord,
  deleteQualityRecord,
  updateQualityRecord,
  type ContentStatus,
  type QualityRecordType,
} from '@/lib/enterprise';

/**
 * 质量体系 CMS 服务端 Actions（Phase 4.5）。
 *
 * 令牌只存在于服务端：所有写操作由服务端读取 HttpOnly Cookie 后
 * 转发给后端 /api/v1/cms/quality/**。
 *
 * 数据诚实约束：机构 / 证书编号 / 日期均可留空，提交时按 null 传出，
 * **不填充任何占位值或推断值**。
 */

export interface QualityFormState {
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

function isRecordType(value: string): value is QualityRecordType {
  return (
    value === 'CERTIFICATION' ||
    value === 'TEST_REPORT' ||
    value === 'QUALITY_CONTROL' ||
    value === 'STANDARD'
  );
}

/** 日期（date input，YYYY-MM-DD）→ ISO；空值返回 null */
function toIsoOrNull(raw: string): string | null {
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** 创建 / 更新质量记录（id 为 null 时创建） */
export async function saveQualityRecordAction(
  id: string | null,
  _prevState: QualityFormState,
  formData: FormData,
): Promise<QualityFormState> {
  const title = str(formData, 'title');
  const slug = str(formData, 'slug');

  if (!title || title.length < 2) return { ok: false, error: '请填写标题（至少 2 个字符）' };
  if (!slug) return { ok: false, error: '请填写 URL 标识（slug）' };

  const recordType = str(formData, 'recordType');
  if (!isRecordType(recordType)) return { ok: false, error: '请选择记录类型' };

  const status = str(formData, 'status') || 'DRAFT';
  if (!isStatus(status)) return { ok: false, error: '发布状态不合法' };

  const issueDateRaw = str(formData, 'issueDate');
  const expiryDateRaw = str(formData, 'expiryDate');

  const body: Record<string, unknown> = {
    title,
    slug,
    recordType,
    status,
    issuer: str(formData, 'issuer') || null,
    certificateNumber: str(formData, 'certificateNumber') || null,
    issueDate: toIsoOrNull(issueDateRaw),
    expiryDate: toIsoOrNull(expiryDateRaw),
    description: str(formData, 'description') || null,
    mediaId: str(formData, 'mediaId') || null,
    sortOrder: str(formData, 'sortOrder') ? Number(str(formData, 'sortOrder')) : 0,
    seoTitle: str(formData, 'seoTitle') || null,
    seoDescription: str(formData, 'seoDescription') || null,
  };

  const publishedAtRaw = str(formData, 'publishedAt');
  if (publishedAtRaw) {
    body.publishedAt = new Date(publishedAtRaw).toISOString();
  } else if (id) {
    body.publishedAt = null;
  }

  const token = await getSessionToken();
  const result = id
    ? await updateQualityRecord(token, id, body)
    : await createQualityRecord(token, body);

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/quality');
  if (id) revalidatePath(`/quality/${id}/edit`);
  return { ok: true, savedId: result.data.id };
}

/** 删除质量记录（仅解除媒体关联，不删除媒体文件） */
export async function deleteQualityRecordAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteQualityRecord(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/quality');
  return { ok: true };
}

/* --------------------------- 证书文件选择器 --------------------------- */

export interface PickerResult {
  ok: boolean;
  items: MediaAsset[];
  total: number;
  totalPages: number;
  error?: string;
}

/** 拉取媒体库列表（质量模块只选文件，不自行上传） */
export async function fetchMediaForQuality(
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
