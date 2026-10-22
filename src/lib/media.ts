/**
 * 管理后台 —— Media Library CMS API 访问层（服务端）。
 *
 * 全部走 HttpOnly Cookie 中的 JWT（Authorization: Bearer 转发给后端
 * /api/v1/cms/media/** 接口，均受 JwtAuthGuard 保护）。
 * 上传使用独立函数：不设置 Content-Type，由 fetch 自动生成 multipart boundary。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 类型 ------------------------------- */

export type MediaCategory = 'IMAGE' | 'DOCUMENT';

/**
 * 媒体用途分类（Phase 5.6）——回答「这张图用在哪个业务场景」，
 * 与 category（文件类型）正交。取值对齐站点上实际有图的页面。
 */
export type MediaUsage =
  | 'BLOG'
  | 'PRODUCT'
  | 'CERTIFICATE'
  | 'FACTORY'
  | 'PRODUCTION'
  | 'LOADING'
  | 'EXHIBITION'
  | 'APPLICATION'
  | 'SITE'
  | 'OTHER';

/** 用途选项（顺序即媒体库筛选与上传下拉的展示顺序） */
export const MEDIA_USAGES: { value: MediaUsage; label: string; hint: string }[] = [
  { value: 'BLOG', label: '文章', hint: '文章封面 / 正文配图' },
  { value: 'PRODUCT', label: '产品', hint: '产品详情图库' },
  { value: 'CERTIFICATE', label: '证书', hint: '认证证书 / 检测报告' },
  { value: 'FACTORY', label: '工厂', hint: '厂房 / 厂区设施' },
  { value: 'PRODUCTION', label: '生产', hint: '生产流程 / 生产设备' },
  { value: 'LOADING', label: '装车', hint: '装柜 / 装车现场' },
  { value: 'EXHIBITION', label: '展会', hint: '展会与客户来访照片' },
  { value: 'APPLICATION', label: '应用场景', hint: '应用场景页封面' },
  { value: 'SITE', label: '站点配图', hint: '首页等结构化分区配图' },
  { value: 'OTHER', label: '其他', hint: '暂未归类' },
];

const MEDIA_USAGE_LABELS: Record<MediaUsage, string> = MEDIA_USAGES.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<MediaUsage, string>,
);

/** 用途枚举 → 中文标签（未知值回落原文，便于兼容后端新增枚举） */
export function mediaUsageLabel(usage: string | null | undefined): string {
  if (!usage) return '未分类';
  return MEDIA_USAGE_LABELS[usage as MediaUsage] ?? usage;
}

export interface MediaAsset {
  id: string;
  /** 存储文件名（UUID + 扩展名） */
  filename: string;
  /** 客户端原始文件名（仅展示） */
  originalName: string;
  /** 存储对象键 media/<年>/<月>/<uuid>.<ext>（非文件系统路径） */
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  /** Phase 5.0：图片 SEO 元数据 */
  title: string | null;
  caption: string | null;
  description: string | null;
  provider: 'LOCAL' | 'TENCENT_COS';
  category: MediaCategory;
  /** 业务用途分类（Phase 5.6；null = 未分类） */
  usage: MediaUsage | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMedia {
  items: MediaAsset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListMediaParams {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: MediaCategory;
  usage?: MediaUsage;
}

/** 上传大小提示上限（与后端 MAX_MEDIA_FILE_SIZE 保持一致，仅用于界面文案） */
export const MEDIA_MAX_SIZE_MB = 10;

/* ------------------------------- 查询 ------------------------------- */

/** 媒体列表（分页 + keyword/category 筛选） */
export function listMedia(
  token: string | null,
  params: ListMediaParams = {},
): Promise<ApiResult<PaginatedMedia>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.category) search.set('category', params.category);
  if (params.usage) search.set('usage', params.usage);
  const query = search.toString();
  return authorizedRequest<PaginatedMedia>(`/cms/media${query ? `?${query}` : ''}`, token);
}

/** 媒体详情 */
export function getMedia(token: string | null, id: string): Promise<ApiResult<MediaAsset>> {
  return authorizedRequest<MediaAsset>(`/cms/media/${id}`, token);
}

/** 更新媒体元数据（Phase 5.0 SEO 字段 + Phase 5.6 用途分类） */
export function updateMediaSeo(
  token: string | null,
  id: string,
  input: {
    altText?: string;
    title?: string;
    caption?: string;
    description?: string;
    /** 空串 = 置为未分类 */
    usage?: MediaUsage | '';
  },
): Promise<ApiResult<MediaAsset>> {
  return authorizedRequest<MediaAsset>(`/cms/media/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** 删除媒体（被产品图片引用时后端返回 400 “Media asset is in use.”） */
export function deleteMedia(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/media/${id}`, token, { method: 'DELETE' });
}

/* ------------------------------- 上传 ------------------------------- */

/**
 * 上传媒体（multipart/form-data，字段名 file）。
 *
 * 独立于 authorizedRequest：绝不能预设 Content-Type（会破坏 boundary），
 * 也不能走 init.headers 覆盖——Headers 由 fetch 依据 FormData 自动生成。
 */
export async function uploadMediaAsset(
  token: string | null,
  formData: FormData,
): Promise<ApiResult<MediaAsset>> {
  const API_BASE = (
    process.env.ADMIN_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://127.0.0.1:4000/api/v1'
  ).replace(/\/$/, '');

  try {
    const response = await fetch(`${API_BASE}/cms/media/upload`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });

    const json = (await response.json().catch(() => null)) as {
      success: boolean;
      data?: MediaAsset;
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

/* ------------------------------- 展示辅助 ------------------------------- */

/** 字节数 → 可读大小（如 1.5 MB） */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/** MIME → 中文类型标签 */
export function mediaTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/avif': 'AVIF',
    // Phase 4.5：质量证书 / 报告用 PDF
    'application/pdf': 'PDF',
  };
  return map[mimeType] ?? mimeType;
}

/** 删除失败的友好提示映射（后端 message → 中文业务解释） */
export function friendlyDeleteError(message: string): string {
  if (message.includes('Media asset is in use.')) {
    return '该媒体正被产品图片或博客封面引用，请先移除引用后再删除';
  }
  return message;
}
