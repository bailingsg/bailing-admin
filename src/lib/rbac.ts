/**
 * 管理后台 —— 账号 / 角色 / 员工联系方式 API 客户端（Phase 4.6）。
 *
 * 全部走 lib/api.ts 的 authorizedRequest（HttpOnly Cookie 中的 JWT → Bearer），
 * 由后端 JwtAuthGuard + PermissionsGuard 双重校验；前端只做「有没有权限渲染按钮」，
 * 真正的拦截永远发生在后端。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 账号 ------------------------------- */

export type AdminRole = 'ADMIN' | 'EDITOR';

export interface AccountRoleRef {
  id: string;
  key: string;
  name: string;
}

export interface AccountListItem {
  id: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  role: AdminRole;
  roles: AccountRoleRef[];
  isActive: boolean;
  isProtected: boolean;
  hasContact: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AccountDetail extends AccountListItem {
  updatedAt: string;
  contact: {
    id: string;
    displayName: string;
    jobTitle: string | null;
    showOnSite: boolean;
    isLeadContact: boolean;
  } | null;
}

export interface PaginatedAccounts {
  items: AccountListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignableRole {
  id: string;
  key: string;
  name: string;
  assignable: boolean;
  permissionCount: number;
}

export interface CreateAccountResult {
  account: AccountDetail;
  /** 初始口令明文：仅创建响应返回一次，请立即转交员工 */
  initialPassword: string;
}

export interface ListAccountsQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  jobTitle?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  jobTitle?: string;
  roleIds: string[];
  initialPassword?: string;
  isActive?: boolean;
}

export interface UpdateAccountInput {
  name?: string;
  email?: string;
  jobTitle?: string | null;
  roleIds?: string[];
}

export interface ResetPasswordResult {
  /**
   * 新口令明文：仅重置响应返回一次（后端字段名 initialPassword）。
   * 指定了口令时同样返回该口令；之后任何接口都不再返回，请立即转交员工。
   */
  initialPassword: string;
}

function toQuery(query: ListAccountsQuery): string {
  const search = new URLSearchParams();
  if (query.page && query.page > 1) search.set('page', String(query.page));
  if (query.limit) search.set('limit', String(query.limit));
  if (query.keyword) search.set('keyword', query.keyword);
  if (query.jobTitle) search.set('jobTitle', query.jobTitle);
  if (query.roleId) search.set('roleId', query.roleId);
  if (query.isActive !== undefined) search.set('isActive', String(query.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listAccounts(
  token: string | null,
  query: ListAccountsQuery = {},
): Promise<ApiResult<PaginatedAccounts>> {
  return authorizedRequest<PaginatedAccounts>(`/cms/accounts${toQuery(query)}`, token);
}

export function getAccount(token: string | null, id: string): Promise<ApiResult<AccountDetail>> {
  return authorizedRequest<AccountDetail>(`/cms/accounts/${id}`, token);
}

export function listAssignableRoles(token: string | null): Promise<ApiResult<AssignableRole[]>> {
  return authorizedRequest<AssignableRole[]>('/cms/accounts/assignable-roles', token);
}

export function createAccount(
  token: string | null,
  input: CreateAccountInput,
): Promise<ApiResult<CreateAccountResult>> {
  return authorizedRequest<CreateAccountResult>('/cms/accounts', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAccount(
  token: string | null,
  id: string,
  input: UpdateAccountInput,
): Promise<ApiResult<AccountDetail>> {
  return authorizedRequest<AccountDetail>(`/cms/accounts/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function setAccountStatus(
  token: string | null,
  id: string,
  isActive: boolean,
): Promise<ApiResult<AccountDetail>> {
  return authorizedRequest<AccountDetail>(`/cms/accounts/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export function resetAccountPassword(
  token: string | null,
  id: string,
  newPassword?: string,
): Promise<ApiResult<ResetPasswordResult>> {
  return authorizedRequest<ResetPasswordResult>(`/cms/accounts/${id}/reset-password`, token, {
    method: 'POST',
    body: JSON.stringify(newPassword ? { newPassword } : {}),
  });
}

/* ------------------------------- 角色 ------------------------------- */

export type RoleStatus = 'ACTIVE' | 'DISABLED';

export interface RoleListItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: RoleStatus;
  isProtected: boolean;
  isSystem: boolean;
  sortOrder: number;
  userCount: number;
  permissionCount: number;
  totalPermissions: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRoles {
  items: RoleListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}

export interface RoleDetail extends RoleListItem {
  permissions: string[];
  users: RoleUser[];
}

export interface Permission {
  key: string;
  module: string;
  action: string;
  name: string;
  description: string;
  isNav: boolean;
  sortOrder: number;
}

export interface PermissionModule {
  key: string;
  name: string;
  sortOrder: number;
  permissions: Permission[];
}

export interface PermissionMatrix {
  modules: PermissionModule[];
  total: number;
}

export interface CreateRoleInput {
  name: string;
  key: string;
  description?: string;
  sortOrder?: number;
}

/** 创建角色结果（POST /cms/roles 只返回摘要） */
export interface CreateRoleResult {
  id: string;
  key: string;
  name: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  status?: RoleStatus;
  sortOrder?: number;
}

export function listRoles(
  token: string | null,
  query: { page?: number; limit?: number; keyword?: string; status?: RoleStatus } = {},
): Promise<ApiResult<PaginatedRoles>> {
  const search = new URLSearchParams();
  if (query.page && query.page > 1) search.set('page', String(query.page));
  if (query.limit) search.set('limit', String(query.limit));
  if (query.keyword) search.set('keyword', query.keyword);
  if (query.status) search.set('status', query.status);
  const qs = search.toString();
  return authorizedRequest<PaginatedRoles>(`/cms/roles${qs ? `?${qs}` : ''}`, token);
}

export function getRole(token: string | null, id: string): Promise<ApiResult<RoleDetail>> {
  return authorizedRequest<RoleDetail>(`/cms/roles/${id}`, token);
}

export function getPermissionMatrix(token: string | null): Promise<ApiResult<PermissionMatrix>> {
  return authorizedRequest<PermissionMatrix>('/cms/roles/permission-matrix', token);
}

export function createRole(
  token: string | null,
  input: CreateRoleInput,
): Promise<ApiResult<CreateRoleResult>> {
  return authorizedRequest<CreateRoleResult>('/cms/roles', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRole(
  token: string | null,
  id: string,
  input: UpdateRoleInput,
): Promise<ApiResult<RoleDetail>> {
  return authorizedRequest<RoleDetail>(`/cms/roles/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * 覆盖式设置角色权限（后端会校验不得超出操作人自身权限范围）。
 *
 * 注意：后端 DTO 字段名为 `permissionKeys`（不是 permissions），
 * 与后端 AssignPermissionsDto 保持一致，否则会被全局 ValidationPipe 判 400。
 */
export function assignRolePermissions(
  token: string | null,
  id: string,
  permissions: string[],
): Promise<ApiResult<RoleDetail>> {
  return authorizedRequest<RoleDetail>(`/cms/roles/${id}/permissions`, token, {
    method: 'PUT',
    body: JSON.stringify({ permissionKeys: permissions }),
  });
}

/** 删除角色（受保护 / 仍有关联账号的角色会被后端拒绝） */
export function deleteRole(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/roles/${id}`, token, { method: 'DELETE' });
}

/* --------------------------- 员工联系方式 --------------------------- */

export interface ContactEmployee {
  id: string;
  name: string | null;
  email: string;
  loginEmail: string;
  isActive: boolean;
}

export interface Contact {
  id: string;
  adminUserId: string;
  displayName: string;
  jobTitle: string | null;
  displayEmail: string | null;
  whatsapp: string | null;
  showOnSite: boolean;
  isLeadContact: boolean;
  sortOrder: number;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  employee: ContactEmployee;
}

export interface ContactList {
  items: Contact[];
  total: number;
  employeesWithoutContact: {
    id: string;
    name: string | null;
    email: string;
    jobTitle: string | null;
  }[];
}

export interface UpsertContactInput {
  adminUserId: string;
  displayName: string;
  jobTitle?: string;
  displayEmail?: string;
  whatsapp?: string;
  showOnSite?: boolean;
  isLeadContact?: boolean;
  sortOrder?: number;
  internalNote?: string;
}

export function listContacts(
  token: string | null,
  query: { keyword?: string; isLeadContact?: boolean; showOnSite?: boolean } = {},
): Promise<ApiResult<ContactList>> {
  const search = new URLSearchParams();
  if (query.keyword) search.set('keyword', query.keyword);
  if (query.isLeadContact !== undefined) search.set('isLeadContact', String(query.isLeadContact));
  if (query.showOnSite !== undefined) search.set('showOnSite', String(query.showOnSite));
  const qs = search.toString();
  return authorizedRequest<ContactList>(`/cms/contacts${qs ? `?${qs}` : ''}`, token);
}

export function upsertContact(
  token: string | null,
  input: UpsertContactInput,
): Promise<ApiResult<Contact>> {
  return authorizedRequest<Contact>('/cms/contacts', token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function setContactVisibility(
  token: string | null,
  id: string,
  showOnSite: boolean,
): Promise<ApiResult<Contact>> {
  return authorizedRequest<Contact>(`/cms/contacts/${id}/visibility`, token, {
    method: 'PATCH',
    body: JSON.stringify({ showOnSite }),
  });
}

export function deleteContact(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/contacts/${id}`, token, { method: 'DELETE' });
}

/* ------------------------ 站点内容 / 导航（Phase 4.7） ------------------------ */

export type SitePageKey = 'HOME' | 'ABOUT' | 'CONTACT';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
export type NavLocation = 'HEADER' | 'FOOTER';

export interface SiteSectionItem {
  title: string;
  description: string | null;
  href: string | null;
}

export interface SiteSectionStat {
  label: string;
  value: string;
}

export interface SiteSection {
  id: string;
  page: SitePageKey;
  sectionKey: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  media: {
    id: string;
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
    mimeType: string;
  } | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  items: SiteSectionItem[];
  stats: SiteSectionStat[];
  status: ContentStatus;
  sortOrder: number;
  publishedAt: string | null;
  /** 线上版本号（0 = 从未发布） */
  publishedVersion?: number;
  /** 是否存在未发布的编辑稿 */
  hasUnpublishedChanges?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSectionList {
  items: SiteSection[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateSiteSectionInput {
  page: SitePageKey;
  sectionKey: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  mediaId?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  items?: SiteSectionItem[];
  stats?: SiteSectionStat[];
  // Phase 1：status 不再可写——发布态只能经 POST /publish、/unpublish 变更
  sortOrder?: number;
}

/**
 * 更新入参：与新建相同字段均可选； mediaId / ctaUrl / items / stats 额外支持
 * 显式 null 表示「清空」（Partial 交集会吞掉 null，故先用 Omit 排除）。
 */
export type UpdateSiteSectionInput = Partial<
  Omit<CreateSiteSectionInput, 'mediaId' | 'ctaUrl' | 'items' | 'stats'>
> & {
  mediaId?: string | null;
  ctaUrl?: string | null;
  items?: SiteSectionItem[] | null;
  stats?: SiteSectionStat[] | null;
};

export interface NavItem {
  id: string;
  location: NavLocation;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NavItemList {
  items: NavItem[];
  total: number;
}

export interface CreateNavItemInput {
  location: NavLocation;
  label: string;
  url: string;
  sortOrder?: number;
  isActive?: boolean;
  openInNewTab?: boolean;
}

export type UpdateNavItemInput = Partial<CreateNavItemInput>;

/** 内容状态中文标签（全站统一） */
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  UNPUBLISHED: '已下架',
  ARCHIVED: '已归档',
};

/** 内容状态顺序（与后端一致，供筛选与表单枚举） */
export const CONTENT_STATUSES: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'];

export const SITE_PAGE_LABELS: Record<SitePageKey, string> = {
  HOME: '首页',
  ABOUT: '关于我们',
  CONTACT: '联系页',
};

export const NAV_LOCATION_LABELS: Record<NavLocation, string> = {
  HEADER: '页眉导航',
  FOOTER: '页脚链接',
};

/* ------------------------------ 站点分区 API ------------------------------ */

export function listSiteSections(
  token: string | null,
  query: { page?: SitePageKey; status?: ContentStatus; keyword?: string; pageNum?: number; pageSize?: number } = {},
): Promise<ApiResult<SiteSectionList>> {
  const search = new URLSearchParams();
  if (query.page) search.set('page', query.page);
  if (query.status) search.set('status', query.status);
  if (query.keyword) search.set('keyword', query.keyword);
  if (query.pageNum && query.pageNum > 1) search.set('pageNum', String(query.pageNum));
  if (query.pageSize) search.set('pageSize', String(query.pageSize));
  const qs = search.toString();
  return authorizedRequest<SiteSectionList>(`/cms/site/sections${qs ? `?${qs}` : ''}`, token);
}

export function getSiteSection(token: string | null, id: string): Promise<ApiResult<SiteSection>> {
  return authorizedRequest<SiteSection>(`/cms/site/sections/${id}`, token);
}

export function createSiteSection(
  token: string | null,
  input: CreateSiteSectionInput,
): Promise<ApiResult<SiteSection>> {
  return authorizedRequest<SiteSection>('/cms/site/sections', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSiteSection(
  token: string | null,
  id: string,
  input: UpdateSiteSectionInput,
): Promise<ApiResult<SiteSection>> {
  return authorizedRequest<SiteSection>(`/cms/site/sections/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSiteSection(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/site/sections/${id}`, token, { method: 'DELETE' });
}

/* ------------------------------ 导航项 API ------------------------------ */

export function listNavItems(
  token: string | null,
  query: { location?: NavLocation; isActive?: boolean } = {},
): Promise<ApiResult<NavItemList>> {
  const search = new URLSearchParams();
  if (query.location) search.set('location', query.location);
  if (query.isActive !== undefined) search.set('isActive', String(query.isActive));
  const qs = search.toString();
  return authorizedRequest<NavItemList>(`/cms/nav/items${qs ? `?${qs}` : ''}`, token);
}

export function createNavItem(
  token: string | null,
  input: CreateNavItemInput,
): Promise<ApiResult<NavItem>> {
  return authorizedRequest<NavItem>('/cms/nav/items', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateNavItem(
  token: string | null,
  id: string,
  input: UpdateNavItemInput,
): Promise<ApiResult<NavItem>> {
  return authorizedRequest<NavItem>(`/cms/nav/items/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteNavItem(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/nav/items/${id}`, token, { method: 'DELETE' });
}
