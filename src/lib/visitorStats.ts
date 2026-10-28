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

/* ────────────────────────── 近期访客 IP（2026-10-27） ────────────────────────── */

/** 明细天数白名单（与后端 DTO 逐字一致，其它值后端 400） */
export const VISITOR_IP_DAYS = [7, 30] as const;
export type VisitorIpDays = (typeof VISITOR_IP_DAYS)[number];

/** 单条 IP 明细（白名单字段：userAgent 不返回） */
export interface VisitorIpItem {
  id: string;
  /** 完整 IP（IPv4 点分 / IPv6 压缩表示） */
  ip: string;
  /** ISO 3166-1 alpha-2，未解析出为 null */
  country: string | null;
  /** 中文国家名（后端用 Intl.DisplayNames 生成），未解析出为 null */
  countryName: string | null;
  visitedAt: string; // ISO
}

/** 国家分布（按访问次数降序，未知国家排最后） */
export interface VisitorCountryStat {
  country: string | null;
  countryName: string | null;
  /** 访问次数 = 该国家的明细行数 */
  visits: number;
  /** 独立 IP 数 = COUNT(DISTINCT ip)，不是行数 */
  uniqueIps: number;
}

/** visitor-ips 响应 */
export interface VisitorIpsResponse {
  scope: VisitorScope;
  days: VisitorIpDays;
  items: VisitorIpItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** 国家分布：只受时间窗约束，不跟随 ip / country 过滤 */
  countries: VisitorCountryStat[];
  generatedAt: string;
}

/**
 * 近期访客 IP 明细 + 国家分布（visitor_records.read；非超管 403）。
 *
 * days 只接受 7 / 30；ip 为前缀匹配（如 `203.0.113.`），country 为两位国家代码。
 */
export function getVisitorIps(
  token: string | null,
  params: { days: VisitorIpDays; page: number; pageSize: number; ip?: string; country?: string },
): Promise<ApiResult<VisitorIpsResponse>> {
  const query = new URLSearchParams({
    days: String(params.days),
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.ip) query.set('ip', params.ip);
  if (params.country) query.set('country', params.country);
  return authorizedRequest<VisitorIpsResponse>(`/cms/visitor-ips?${query.toString()}`, token);
}
