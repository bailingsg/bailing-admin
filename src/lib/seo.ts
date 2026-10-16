/**
 * 管理后台 —— SEO 管理中心 API 客户端（Phase 5.0）。
 *
 * 全部走 lib/api.ts 的 authorizedRequest（HttpOnly Cookie 中的 JWT → Bearer），
 * 由后端 JwtAuthGuard + PermissionsGuard 双重校验；前端只做「有没有权限渲染按钮」，
 * 真正的拦截永远发生在后端。
 *
 * 对应后端 /api/v1/cms/seo/**（权限：seo.read / seo.manage / seo.audit /
 * seo.redirect / seo.settings）。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 类型 ------------------------------- */

export type SeoEntityType =
  | 'PAGE'
  | 'PRODUCT'
  | 'PRODUCT_CATEGORY'
  | 'BLOG_POST'
  | 'BLOG_CATEGORY'
  | 'APPLICATION'
  | 'FACTORY_SECTION'
  | 'QUALITY_RECORD';

export type SeoStatus = 'UNAUDITED' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

export type SchemaType = 'NONE' | 'WEB_PAGE' | 'PRODUCT' | 'ARTICLE' | 'FAQ_PAGE';

export const SEO_ENTITY_TYPE_LABELS: Record<SeoEntityType, string> = {
  PAGE: '静态页面',
  PRODUCT: '产品',
  PRODUCT_CATEGORY: '产品分类',
  BLOG_POST: '博客文章',
  BLOG_CATEGORY: '博客分类',
  APPLICATION: '应用场景',
  FACTORY_SECTION: '工厂分区',
  QUALITY_RECORD: '质量记录',
};

export const SEO_STATUS_LABELS: Record<SeoStatus, string> = {
  UNAUDITED: '未审计',
  GOOD: '优秀',
  NEEDS_IMPROVEMENT: '待改进',
  POOR: '差',
};

export const SCHEMA_TYPE_LABELS: Record<SchemaType, string> = {
  NONE: '不输出',
  WEB_PAGE: 'WebPage',
  PRODUCT: 'Product',
  ARTICLE: 'Article',
  FAQ_PAGE: 'FAQPage',
};

export const SEO_LENGTH_GUIDE = {
  TITLE_MIN: 20,
  TITLE_MAX: 60,
  DESCRIPTION_MIN: 120,
  DESCRIPTION_MAX: 160,
} as const;

/** 单项评分检查（与后端 seo-score.ts 一致） */
export interface SeoCheckResult {
  key: string;
  label: string;
  severity: 'error' | 'warning' | 'passed';
  weight: number;
  earned: number;
  message: string;
  suggestion?: string;
}

/** 统一 SEO 档案（详情 / 编辑用） */
export interface SeoProfile {
  entityType: string;
  entityId: string;
  entityName: string | null;
  routePath: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  focusKeyword: string | null;
  keywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  schemaType: string;
  schemaData: unknown;
  relatedData: unknown;
  seoScore: number | null;
  seoStatus: string;
  lastAuditAt: string | null;
  /** 评分明细（可解释性）；列表接口不返回 */
  checks: SeoCheckResult[] | null;
  updatedAt: string;
}

/** 后台列表行 */
export interface SeoEntityListItem {
  entityType: string;
  entityId: string;
  name: string;
  url: string;
  effectiveTitle: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonical: string | null;
  ogImage: string | null;
  schemaType: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  seoScore: number | null;
  seoStatus: string;
  businessStatus: string;
  updatedAt: string;
}

export interface PaginatedSeoEntities {
  items: SeoEntityListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SeoOverview {
  totalEntities: number;
  indexedEntities: number;
  noindexEntities: number;
  missingMetaTitle: number;
  missingMetaDescription: number;
  missingCanonical: number;
  missingOgImage: number;
  missingAltImages: number;
  totalImages: number;
  scoreDistribution: { good: number; needsImprovement: number; poor: number; unaudited: number };
  byType: { entityType: string; label: string; total: number; missingTitle: number }[];
  latestAudit: { id: string; summary: SeoAuditSummary; createdAt: string } | null;
}

export interface SeoAuditSummary {
  total: number;
  passed: number;
  warnings: number;
  errors: number;
  critical: number;
}

export interface SeoAuditIssue {
  severity: 'critical' | 'error' | 'warning' | 'passed';
  check: string;
  title: string;
  entityType: string | null;
  entityId: string | null;
  routePath: string | null;
  entityName: string | null;
  message: string;
  suggestion: string;
}

export interface SeoAuditResult {
  id: string;
  summary: SeoAuditSummary;
  issues: SeoAuditIssue[];
  durationMs: number;
  createdAt: string;
}

export interface SeoRedirect {
  id: string;
  sourcePath: string;
  targetPath: string;
  statusCode: number;
  isActive: boolean;
  note: string | null;
  hits: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSeoRedirects {
  items: SeoRedirect[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SeoSitemapEntry {
  path: string;
  lastModified: string;
  changeFrequency: string;
  priority: number;
}

/** 全局设置（后台全量） */
export interface SeoSettings {
  siteName: string;
  siteTitle: string | null;
  siteDescription: string | null;
  defaultOgImage: string | null;
  defaultTwitterImage: string | null;
  canonicalDomain: string | null;
  pageTitleTemplate: string;
  productTitleTemplate: string;
  blogTitleTemplate: string;
  categoryTitleTemplate: string;
  companyName: string | null;
  companyLogo: string | null;
  companyWebsite: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyCountry: string | null;
  linkedin: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  whatsapp: string | null;
  googleSiteVerification: string | null;
  googleAnalyticsId: string | null;
  googleTagManagerId: string | null;
}

/** 档案更新入参（空串 = 清空可空字段） */
export interface UpdateSeoProfileInput {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  focusKeyword?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaType?: SchemaType;
  schemaData?: string;
  relatedData?: string;
}

export interface QuickFixFieldDiff {
  field: string;
  before: string | null;
  after: string;
}

export interface QuickFixResult {
  applied: QuickFixFieldDiff[];
  skipped: { field: string; reason: string }[];
}

export interface CreateSeoRedirectInput {
  sourcePath: string;
  targetPath: string;
  statusCode?: number;
  isActive?: boolean;
  note?: string;
}

export interface UpdateSeoRedirectInput {
  targetPath?: string;
  statusCode?: number;
  isActive?: boolean;
  note?: string;
}

export interface ListSeoEntitiesQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: string;
  issuesOnly?: boolean;
}

export interface ListSeoRedirectsQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  isActive?: boolean;
}

function toQuery(query: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------- API ------------------------------- */

export function getSeoOverview(token: string | null): Promise<ApiResult<SeoOverview>> {
  return authorizedRequest<SeoOverview>('/cms/seo/overview', token);
}

export function getSeoSettings(token: string | null): Promise<ApiResult<SeoSettings>> {
  return authorizedRequest<SeoSettings>('/cms/seo/settings', token);
}

export function updateSeoSettings(
  token: string | null,
  input: Partial<SeoSettings>,
): Promise<ApiResult<SeoSettings>> {
  return authorizedRequest<SeoSettings>('/cms/seo/settings', token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function listSeoEntities(
  token: string | null,
  scope: 'pages' | 'products' | 'blog',
  query: ListSeoEntitiesQuery = {},
): Promise<ApiResult<PaginatedSeoEntities>> {
  return authorizedRequest<PaginatedSeoEntities>(`/cms/seo/${scope}${toQuery(query)}`, token);
}

export function getSeoProfile(
  token: string | null,
  entityType: string,
  entityId: string,
): Promise<ApiResult<SeoProfile>> {
  return authorizedRequest<SeoProfile>(
    `/cms/seo/profiles/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    token,
  );
}

export function updateSeoProfile(
  token: string | null,
  entityType: string,
  entityId: string,
  input: UpdateSeoProfileInput,
): Promise<ApiResult<SeoProfile>> {
  return authorizedRequest<SeoProfile>(
    `/cms/seo/profiles/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    token,
    { method: 'PUT', body: JSON.stringify(input) },
  );
}

export function quickFixSeoProfile(
  token: string | null,
  entityType: string,
  entityId: string,
  fields: string[],
  dryRun = false,
): Promise<ApiResult<QuickFixResult>> {
  return authorizedRequest<QuickFixResult>(
    `/cms/seo/profiles/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/quick-fix`,
    token,
    { method: 'POST', body: JSON.stringify({ fields, dryRun }) },
  );
}

export function listSeoRedirects(
  token: string | null,
  query: ListSeoRedirectsQuery = {},
): Promise<ApiResult<PaginatedSeoRedirects>> {
  return authorizedRequest<PaginatedSeoRedirects>(`/cms/seo/redirects${toQuery(query)}`, token);
}

export function createSeoRedirect(
  token: string | null,
  input: CreateSeoRedirectInput,
): Promise<ApiResult<SeoRedirect>> {
  return authorizedRequest<SeoRedirect>('/cms/seo/redirects', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSeoRedirect(
  token: string | null,
  id: string,
  input: UpdateSeoRedirectInput,
): Promise<ApiResult<SeoRedirect>> {
  return authorizedRequest<SeoRedirect>(`/cms/seo/redirects/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSeoRedirect(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/seo/redirects/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
}

export function getSeoSitemap(token: string | null): Promise<ApiResult<SeoSitemapEntry[]>> {
  return authorizedRequest<SeoSitemapEntry[]>('/cms/seo/sitemap', token);
}

export function getSeoRobots(token: string | null): Promise<ApiResult<{ robots: string }>> {
  return authorizedRequest<{ robots: string }>('/cms/seo/robots', token);
}

export function getSeoAudit(token: string | null): Promise<ApiResult<SeoAuditResult | null>> {
  return authorizedRequest<SeoAuditResult | null>('/cms/seo/audit', token);
}

export function runSeoAudit(token: string | null): Promise<ApiResult<SeoAuditResult>> {
  return authorizedRequest<SeoAuditResult>('/cms/seo/audit', token, { method: 'POST' });
}
