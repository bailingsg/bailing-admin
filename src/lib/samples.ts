/**
 * 管理后台 —— 样品管理数据访问层（服务端，Phase 5.1）。
 *
 * 所有请求以 HttpOnly Cookie 中的 JWT 调后端 /api/v1/cms/samples/*。
 * 权限判定后端强校验；本层只负责传参与错误呈现。
 */

import { authorizedRequest, getCurrentAdmin, type ApiResult } from './api';

export { getCurrentAdmin as getSampleProfile };

/* ------------------------------- 类型 ------------------------------- */

export type SampleStatus = 'IN_STOCK' | 'REQUEST_OUT' | 'REJECTED' | 'OUT';

export const SAMPLE_STATUSES: SampleStatus[] = ['IN_STOCK', 'REQUEST_OUT', 'REJECTED'];

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  IN_STOCK: '库中',
  REQUEST_OUT: '申请出库',
  REJECTED: '已拒绝',
  OUT: '已出库',
};

export interface SampleItem {
  id: string;
  code: string;
  name: string;
  spec: string | null;
  material: string | null;
  usage: string | null;
  quantity: number;
  unit: string;
  location: string;
  remark: string | null;
  status: SampleStatus;
  ownerId: string;
  ownerName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SampleDetail extends SampleItem {
  grants: {
    id: string;
    granteeId: string;
    granteeName: string | null;
    grantedById: string;
    createdAt: string;
  }[];
  pendingRequest: {
    id: string;
    requesterId: string;
    requesterName: string | null;
    purpose: string;
    createdAt: string;
  } | null;
}

export type SampleRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export const SAMPLE_REQUEST_STATUS_LABELS: Record<SampleRequestStatus, string> = {
  PENDING: '待审批',
  APPROVED: '已同意出库',
  REJECTED: '已拒绝',
  WITHDRAWN: '已撤回',
};

export interface SampleRequestItem {
  id: string;
  sampleId: string;
  sampleCode: string;
  sampleName: string;
  requesterId: string;
  requesterName: string | null;
  ownerId: string;
  ownerName: string | null;
  purpose: string;
  status: SampleRequestStatus;
  decidedById: string | null;
  decidedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type SampleResult<T> = ApiResult<T>;

export interface SampleLogItem {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string;
  targetId: string | null;
  summary: string | null;
  diff: unknown;
  createdAt: string;
}

export interface SampleInput {
  name: string;
  spec?: string;
  material?: string;
  usage?: string;
  quantity: number;
  unit: string;
  location: string;
  remark?: string;
}

export interface SampleListQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: SampleStatus;
  ownerId?: string;
}

/* ------------------------------- API ------------------------------- */

export function isAdminProfile(
  profile: { permissions: string[]; isSuperAdmin: boolean } | null,
): boolean {
  if (!profile) return false;
  return profile.isSuperAdmin || profile.permissions.includes('samples.manage');
}

export function listSamples(
  token: string | null,
  query: SampleListQuery = {},
): Promise<SampleResult<Paginated<SampleItem>>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.status) params.set('status', query.status);
  if (query.ownerId) params.set('ownerId', query.ownerId);
  const qs = params.toString();
  return authorizedRequest<Paginated<SampleItem>>(`/cms/samples${qs ? `?${qs}` : ''}`, token);
}

export function listArchiveSamples(
  token: string | null,
  query: SampleListQuery = {},
): Promise<SampleResult<Paginated<SampleItem>>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.keyword) params.set('keyword', query.keyword);
  const qs = params.toString();
  return authorizedRequest<Paginated<SampleItem>>(
    `/cms/samples/archive${qs ? `?${qs}` : ''}`,
    token,
  );
}

export function getSample(token: string | null, id: string): Promise<SampleResult<SampleDetail>> {
  return authorizedRequest<SampleDetail>(`/cms/samples/${encodeURIComponent(id)}`, token);
}

export function createSample(
  token: string | null,
  input: SampleInput,
): Promise<SampleResult<SampleItem>> {
  return authorizedRequest<SampleItem>('/cms/samples', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSample(
  token: string | null,
  id: string,
  input: SampleInput,
): Promise<SampleResult<SampleItem>> {
  return authorizedRequest<SampleItem>(`/cms/samples/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function grantSample(
  token: string | null,
  id: string,
  userIds: string[],
): Promise<SampleResult<{ granted: number; skipped: number }>> {
  return authorizedRequest<{ granted: number; skipped: number }>(
    `/cms/samples/${encodeURIComponent(id)}/grants`,
    token,
    { method: 'POST', body: JSON.stringify({ userIds }) },
  );
}

export function revokeSampleGrant(
  token: string | null,
  id: string,
  userId: string,
): Promise<SampleResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(
    `/cms/samples/${encodeURIComponent(id)}/grants/${encodeURIComponent(userId)}`,
    token,
    { method: 'DELETE' },
  );
}

export function createSampleRequest(
  token: string | null,
  id: string,
  purpose: string,
): Promise<SampleResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(
    `/cms/samples/${encodeURIComponent(id)}/requests`,
    token,
    { method: 'POST', body: JSON.stringify({ purpose }) },
  );
}

export function withdrawSampleRequest(
  token: string | null,
  requestId: string,
): Promise<SampleResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(
    `/cms/samples/requests/${encodeURIComponent(requestId)}/withdraw`,
    token,
    { method: 'POST' },
  );
}

export function decideSampleRequest(
  token: string | null,
  requestId: string,
  decision: 'APPROVE' | 'REJECT',
): Promise<SampleResult<{ id: string; decision: string }>> {
  return authorizedRequest<{ id: string; decision: string }>(
    `/cms/samples/requests/${encodeURIComponent(requestId)}/decide`,
    token,
    { method: 'POST', body: JSON.stringify({ decision }) },
  );
}

export type SampleRequestScope = 'pending' | 'mine' | 'all';

export function listSampleRequests(
  token: string | null,
  scope: SampleRequestScope,
  query: { page?: number; limit?: number } = {},
): Promise<SampleResult<Paginated<SampleRequestItem>>> {
  const params = new URLSearchParams();
  params.set('scope', scope);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  return authorizedRequest<Paginated<SampleRequestItem>>(
    `/cms/samples/requests?${params.toString()}`,
    token,
  );
}

export function listSampleLogs(
  token: string | null,
  sampleId: string,
): Promise<SampleResult<SampleLogItem[]>> {
  return authorizedRequest<SampleLogItem[]>(
    `/cms/samples/${encodeURIComponent(sampleId)}/logs`,
    token,
  );
}
