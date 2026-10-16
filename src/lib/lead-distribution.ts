/**
 * 管理后台 —— 询盘分配 API 客户端（Phase 4.6）。
 *
 * 页面上的每一个数字（队列顺序、下一位承接人、每人已分配/剩余数量、完成百分比）
 * 都来自这里的后端接口，**不允许前端本地推算或写死示例值**。
 */

import { authorizedRequest, type ApiResult } from './api';

export type LeadAssignmentSource = 'ROUND_ROBIN' | 'PRIORITY_PLAN';
export type LeadPlanStatus = 'ACTIVE' | 'COMPLETED' | 'CLOSED';

export interface QueueMember {
  adminUserId: string;
  name: string | null;
  email: string;
  isActive: boolean;
  index: number;
  assignedTotal: number;
}

export interface PlanItemProgress {
  adminUserId: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  targetCount: number;
  assignedCount: number;
  remainingCount: number;
  completionPercent: number;
  isEmployeeActive: boolean;
  isEligible: boolean;
  sortOrder: number;
}

export interface Plan {
  id: string;
  name: string;
  status: LeadPlanStatus;
  mode: string;
  startAt: string;
  endAt: string | null;
  totalTarget: number;
  totalAssigned: number;
  completionPercent: number;
  cooldownSeconds: number;
  closedAt: string | null;
  resumeAt: string | null;
  isCooldownElapsed: boolean;
  isInEffect: boolean;
  hasTiltCapacity: boolean;
  isPendingStart: boolean;
  isPendingResume: boolean;
  closedByEmail: string | null;
  createdByEmail: string | null;
  items: PlanItemProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentRfqSummary {
  name: string;
  company: string;
  country: string;
  productName: string | null;
  status: string;
}

export interface Assignment {
  id: string;
  rfqId: string;
  rfqSummary: AssignmentRfqSummary;
  assignee: { adminUserId: string; name: string | null; email: string };
  source: LeadAssignmentSource;
  roundRobinIndex: number | null;
  planId: string | null;
  planName: string | null;
  createdAt: string;
}

export interface LeadDistributionState {
  currentMode: LeadAssignmentSource;
  queue: QueueMember[];
  queueLength: number;
  nextAssignee: {
    adminUserId: string;
    name: string | null;
    email: string;
    index: number;
  } | null;
  activePlan: Plan | null;
  recentAssignments: Assignment[];
  dailyStats: { date: string; count: number }[];
  totalAssigned: number;
  unassignedCount: number;
}

export interface PaginatedAssignments {
  items: Assignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlanLog {
  id: string;
  action: string;
  actorEmail: string | null;
  summary: string | null;
  diff: unknown;
  createdAt: string;
}

export interface EligibleAssignee {
  adminUserId: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  isActive: boolean;
  isLeadContact: boolean;
  assignedTotal: number;
  inActivePlan: boolean;
  remainingInActivePlan: number | null;
  queueIndex: number;
}

export interface PlanItemInput {
  adminUserId: string;
  targetCount: number;
  sortOrder?: number;
}

export interface CreatePlanInput {
  name: string;
  items: PlanItemInput[];
  cooldownSeconds?: number;
  startAt?: string;
  endAt?: string;
}

export interface CreatePlanResult {
  plan: Plan;
  assigned: number;
  /** 已入库但当前不可分配的员工（账号停用 / 未标记为询盘联系人） */
  skipped: string[];
}

export function getLeadDistributionState(token: string | null): Promise<ApiResult<LeadDistributionState>> {
  return authorizedRequest<LeadDistributionState>('/cms/lead-distribution', token);
}

export function listAssignments(
  token: string | null,
  query: { page?: number; limit?: number; assigneeId?: string; source?: LeadAssignmentSource } = {},
): Promise<ApiResult<PaginatedAssignments>> {
  const search = new URLSearchParams();
  if (query.page && query.page > 1) search.set('page', String(query.page));
  if (query.limit) search.set('limit', String(query.limit));
  if (query.assigneeId) search.set('assigneeId', query.assigneeId);
  if (query.source) search.set('source', query.source);
  const qs = search.toString();
  return authorizedRequest<PaginatedAssignments>(`/cms/lead-distribution/assignments${qs ? `?${qs}` : ''}`, token);
}

export function listEligibleAssignees(token: string | null): Promise<ApiResult<EligibleAssignee[]>> {
  return authorizedRequest<EligibleAssignee[]>('/cms/lead-distribution/plans/eligible', token);
}

export function getPlan(token: string | null, id: string): Promise<ApiResult<Plan>> {
  return authorizedRequest<Plan>(`/cms/lead-distribution/plans/${id}`, token);
}

export function listPlanLogs(
  token: string | null,
  id: string,
  take = 50,
): Promise<ApiResult<PlanLog[]>> {
  return authorizedRequest<PlanLog[]>(`/cms/lead-distribution/plans/${id}/logs?take=${take}`, token);
}

export function createPlan(
  token: string | null,
  input: CreatePlanInput,
): Promise<ApiResult<CreatePlanResult>> {
  return authorizedRequest<CreatePlanResult>('/cms/lead-distribution/plans', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updatePlan(
  token: string | null,
  id: string,
  input: Partial<CreatePlanInput>,
): Promise<ApiResult<Plan>> {
  return authorizedRequest<Plan>(`/cms/lead-distribution/plans/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function closePlan(
  token: string | null,
  id: string,
  reason?: string,
): Promise<ApiResult<Plan>> {
  return authorizedRequest<Plan>(`/cms/lead-distribution/plans/${id}/close`, token, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export function resumePlan(token: string | null, id: string): Promise<ApiResult<Plan>> {
  return authorizedRequest<Plan>(`/cms/lead-distribution/plans/${id}/resume`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/* ----------------------------- 展示辅助 ----------------------------- */

export const SOURCE_LABELS: Record<LeadAssignmentSource, string> = {
  ROUND_ROBIN: '正常轮询',
  PRIORITY_PLAN: '倾斜计划',
};

export const PLAN_STATUS_LABELS: Record<LeadPlanStatus, string> = {
  ACTIVE: '生效中',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
};
