/**
 * 访客统计后台 API（访客统计实现规格 5/6 节契约的 TS 类型与请求封装）。
 *
 * 契约字段名 / 类型 / 可空性**不得**自行改动，与后端
 * src/modules/visitor/visitor-stats.service.ts 逐字对应。
 */
import { authorizedRequest, type ApiResult } from './api';

/** 统计口径（后端随每个响应返回） */
export interface VisitorScope {
  timezone: 'UTC';
  sessionTimeoutMinutes: number;
  note: string;
}

/** 单日点（升序；趋势图 points 的单元） */
export interface VisitorDayPoint {
  date: string; // YYYY-MM-DD（UTC）
  uniqueVisitors: number;
  visits: number;
  newVisitors: number;
}

/** overview 响应 */
export interface VisitorOverview {
  scope: VisitorScope;
  today: VisitorDayPoint;
  last7Days: { days: 7; uniqueVisitors: number; visits: number };
  last30Days: { days: 30; uniqueVisitors: number; visits: number };
  generatedAt: string;
}

/** trend 响应 */
export interface VisitorTrend {
  days: 7 | 30;
  scope: VisitorScope;
  points: VisitorDayPoint[];
  generatedAt: string;
}

/** 访客记录单条（白名单字段，规格 6.5） */
export interface VisitorRecordItem {
  id: string;
  maskedIp: string | null;
  country: string | null;
  city: string | null;
  visitedAt: string; // ISO
}

/** records 响应 */
export interface VisitorRecordsResponse {
  scope: VisitorScope;
  period: VisitorRecordPeriod;
  items: VisitorRecordItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  generatedAt: string;
}

export type VisitorRecordPeriod = 'day' | 'week' | 'month';

/** overview（vote: visitor_stats.read） */
export function getVisitorOverview(token: string | null): Promise<ApiResult<VisitorOverview>> {
  return authorizedRequest<VisitorOverview>('/cms/visitor-stats/overview', token);
}

/** trend（days 只接受 7 / 30，其它值后端 400） */
export function getVisitorTrend(
  token: string | null,
  days: 7 | 30,
): Promise<ApiResult<VisitorTrend>> {
  return authorizedRequest<VisitorTrend>(`/cms/visitor-stats/trend?days=${days}`, token);
}

/** 访客记录明细（visitor_records.read；非超管 403） */
export function getVisitorRecords(
  token: string | null,
  params: { period: VisitorRecordPeriod; page: number; pageSize: number },
): Promise<ApiResult<VisitorRecordsResponse>> {
  const query = new URLSearchParams({
    period: params.period,
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  return authorizedRequest<VisitorRecordsResponse>(`/cms/visitor-records?${query.toString()}`, token);
}
