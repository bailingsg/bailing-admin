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
