/**
 * 管理后台 —— Enterprise CMS API 访问层（服务端，Phase 4.5）。
 *
 * 覆盖三大企业内容模块：
 *   · Factory（工厂实力）
 *   · Quality（质量体系）
 *   · Applications（产品应用场景）
 *
 * 全部走 HttpOnly Cookie 中的 JWT（Authorization: Bearer 转发给后端
 * /api/v1/cms/{factory,quality,applications}，均受 JwtAuthGuard 保护）。
 * 浏览器端 JS 永远拿不到令牌。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ============================== 公共类型 ============================== */

export type ContentStatus = 'DRAFT' | 'PUBLISHED';

export const CONTENT_STATUSES: ContentStatus[] = ['DRAFT', 'PUBLISHED'];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
};

export interface EnterpriseMediaRef {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
  originalName?: string;
  isDocument?: boolean;
}

/* ============================== Factory ============================== */

export type FactorySectionType =
  | 'OVERVIEW'
  | 'FACILITY'
  | 'EQUIPMENT'
  | 'PRODUCTION'
  | 'LOADING'
  | 'EXHIBITION';

export const FACTORY_SECTION_TYPES: FactorySectionType[] = [
  'OVERVIEW',
  'FACILITY',
  'EQUIPMENT',
  'PRODUCTION',
  'LOADING',
  'EXHIBITION',
];

export const FACTORY_SECTION_TYPE_LABELS: Record<FactorySectionType, string> = {
  OVERVIEW: '工厂概览',
  FACILITY: '厂区设施',
  EQUIPMENT: '生产设备',
  PRODUCTION: '生产流程',
  LOADING: '装柜发货',
  EXHIBITION: '展会记录',
};

export interface FactoryImage {
  id: string;
  mediaId: string;
  altText: string | null;
  sortOrder: number;
  exhibitionId: string | null;
  media: EnterpriseMediaRef | null;
}

export interface FactoryExhibition {
  id: string;
  sectionId: string;
  name: string;
  heldOn: string | null;
  location: string | null;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  photoCount: number;
  photos: FactoryImage[];
  createdAt: string;
  updatedAt: string;
}

export interface FactorySectionListItem {
  id: string;
  title: string;
  slug: string;
  sectionType: FactorySectionType;
  summary: string | null;
  status: ContentStatus;
  sortOrder: number;
  coverImageUrl: string | null;
  coverMediaId: string | null;
  coverMedia: EnterpriseMediaRef | null;
  imageCount: number;
  exhibitionCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FactorySectionDetail extends FactorySectionListItem {
  content: string | null;
  images: FactoryImage[];
  exhibitions: FactoryExhibition[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PaginatedFactorySections {
  items: FactorySectionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListFactoryParams {
  page?: number;
  limit?: number;
  keyword?: string;
  sectionType?: FactorySectionType;
  status?: ContentStatus;
}

export function listFactorySections(
  token: string | null,
  params: ListFactoryParams = {},
): Promise<ApiResult<PaginatedFactorySections>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.sectionType) search.set('sectionType', params.sectionType);
  if (params.status) search.set('status', params.status);
  const query = search.toString();
  return authorizedRequest<PaginatedFactorySections>(
    `/cms/factory${query ? `?${query}` : ''}`,
    token,
  );
}

export function getFactorySection(
  token: string | null,
  id: string,
): Promise<ApiResult<FactorySectionDetail>> {
  return authorizedRequest<FactorySectionDetail>(`/cms/factory/${id}`, token);
}

export function createFactorySection(
  token: string | null,
  body: Record<string, unknown>,
): Promise<ApiResult<FactorySectionDetail>> {
  return authorizedRequest<FactorySectionDetail>('/cms/factory', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateFactorySection(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResult<FactorySectionDetail>> {
  return authorizedRequest<FactorySectionDetail>(`/cms/factory/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteFactorySection(
  token: string | null,
  id: string,
): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/factory/${id}`, token, { method: 'DELETE' });
}

/* ============================== Quality ============================== */

export type QualityRecordType = 'CERTIFICATION' | 'TEST_REPORT' | 'QUALITY_CONTROL' | 'STANDARD';

export const QUALITY_RECORD_TYPES: QualityRecordType[] = [
  'CERTIFICATION',
  'TEST_REPORT',
  'QUALITY_CONTROL',
  'STANDARD',
];

export const QUALITY_RECORD_TYPE_LABELS: Record<QualityRecordType, string> = {
  CERTIFICATION: '认证证书',
  TEST_REPORT: '检测报告',
  QUALITY_CONTROL: '质量控制',
  STANDARD: '执行标准',
};

export interface QualityRecordListItem {
  id: string;
  title: string;
  slug: string;
  recordType: QualityRecordType;
  issuer: string | null;
  certificateNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: ContentStatus;
  sortOrder: number;
  mediaId: string | null;
  media: EnterpriseMediaRef | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QualityRecordDetail extends QualityRecordListItem {
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PaginatedQualityRecords {
  items: QualityRecordListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListQualityParams {
  page?: number;
  limit?: number;
  keyword?: string;
  recordType?: QualityRecordType;
  status?: ContentStatus;
}

export function listQualityRecords(
  token: string | null,
  params: ListQualityParams = {},
): Promise<ApiResult<PaginatedQualityRecords>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.recordType) search.set('recordType', params.recordType);
  if (params.status) search.set('status', params.status);
  const query = search.toString();
  return authorizedRequest<PaginatedQualityRecords>(
    `/cms/quality${query ? `?${query}` : ''}`,
    token,
  );
}

export function getQualityRecord(
  token: string | null,
  id: string,
): Promise<ApiResult<QualityRecordDetail>> {
  return authorizedRequest<QualityRecordDetail>(`/cms/quality/${id}`, token);
}

export function createQualityRecord(
  token: string | null,
  body: Record<string, unknown>,
): Promise<ApiResult<QualityRecordDetail>> {
  return authorizedRequest<QualityRecordDetail>('/cms/quality', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateQualityRecord(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResult<QualityRecordDetail>> {
  return authorizedRequest<QualityRecordDetail>(`/cms/quality/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteQualityRecord(
  token: string | null,
  id: string,
): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/quality/${id}`, token, { method: 'DELETE' });
}

/* ============================== Applications ============================== */

export interface ApplicationProductRef {
  id: string;
  name: string;
  slug: string;
  status: string;
  sortOrder: number;
}

export interface ApplicationListItem {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  featured: boolean;
  sortOrder: number;
  coverImageUrl: string | null;
  coverMediaId: string | null;
  coverMedia: EnterpriseMediaRef | null;
  productCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail extends ApplicationListItem {
  description: string | null;
  products: ApplicationProductRef[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PaginatedApplications {
  items: ApplicationListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListApplicationsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: ContentStatus;
  featured?: boolean;
}

export function listApplications(
  token: string | null,
  params: ListApplicationsParams = {},
): Promise<ApiResult<PaginatedApplications>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.status) search.set('status', params.status);
  if (params.featured !== undefined) search.set('featured', String(params.featured));
  const query = search.toString();
  return authorizedRequest<PaginatedApplications>(
    `/cms/applications${query ? `?${query}` : ''}`,
    token,
  );
}

export function getApplication(
  token: string | null,
  id: string,
): Promise<ApiResult<ApplicationDetail>> {
  return authorizedRequest<ApplicationDetail>(`/cms/applications/${id}`, token);
}

export function createApplication(
  token: string | null,
  body: Record<string, unknown>,
): Promise<ApiResult<ApplicationDetail>> {
  return authorizedRequest<ApplicationDetail>('/cms/applications', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateApplication(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResult<ApplicationDetail>> {
  return authorizedRequest<ApplicationDetail>(`/cms/applications/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteApplication(
  token: string | null,
  id: string,
): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/applications/${id}`, token, { method: 'DELETE' });
}

/* ============================== 展示辅助 ============================== */

/** 媒体删除被引用时的友好提示映射 */
export function friendlyEnterpriseError(message: string): string {
  if (message.includes('Media asset is in use.')) {
    return '该媒体正被其他内容引用，请先解除引用后再删除';
  }
  if (message.includes('slug 已被占用')) {
    return '该 URL 标识（slug）已被占用，请更换';
  }
  return message;
}

/** 到期提示（克制）：仅当存在真实到期日时给出文案，缺失一律不提示 */
export function expiryHint(expiryDate: string | null): {
  text: string;
  tone: 'muted' | 'warning';
} | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const now = Date.now();
  const days = Math.floor((expiry.getTime() - now) / 86_400_000);
  if (days < 0) return { text: '已到期', tone: 'warning' };
  if (days <= 90) return { text: `${days} 天后到期`, tone: 'warning' };
  return null;
}
