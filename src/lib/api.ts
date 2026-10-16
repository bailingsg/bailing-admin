/**
 * 管理后台 —— 带 JWT 的后端 API 访问层（服务端）。
 *
 * 与 lib/rfq.ts（X-Admin-Token，Phase 3.7 兼容通道）并存：
 *   · 本文件：从 HttpOnly Cookie 取 JWT，以 Authorization: Bearer 调用后端
 *     受 JwtAuthGuard 保护的接口（/auth/me、/cms/stats 及后续 CMS 接口）
 *   · lib/rfq.ts：维持既有 X-Admin-Token 机制访问 RFQ 后台接口，暂不迁移
 */

/* ------------------------------- 类型 ------------------------------- */

/** 管理员角色（与后端 Prisma AdminRole 枚举一致） */
export type AdminRole = 'ADMIN' | 'EDITOR';

/** 管理员档案（GET /auth/me）。Phase 4.6 起带出生效角色与权限 */
export interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
  /** 兼容旧枚举（新逻辑以 roles 为准） */
  role: AdminRole;
  /** 生效中的角色 key（如 SUPER_ADMIN / CONTENT_EDITOR / SALES） */
  roles: string[];
  /** 生效权限 key 全集（导航与按钮级控制唯一依据） */
  permissions: string[];
  isSuperAdmin: boolean;
  jobTitle: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

/** 是否具备某权限（超级管理员恒为 true，与后端 PermissionsGuard 语义一致） */
export function hasPermission(
  profile: Pick<AdminProfile, 'permissions' | 'isSuperAdmin'> | null | undefined,
  permission: string,
): boolean {
  if (!profile) return false;
  if (profile.isSuperAdmin) return true;
  return profile.permissions.includes(permission);
}

/** 是否具备任意一个权限 */
export function hasAnyPermission(
  profile: Pick<AdminProfile, 'permissions' | 'isSuperAdmin'> | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((p) => hasPermission(profile, p));
}

/** Dashboard 统计（GET /cms/stats，全部为后端真实计数） */
export interface CmsStats {
  rfq: { total: number; byStatus: Record<'NEW' | 'CONTACTED' | 'QUOTED' | 'CLOSED', number> };
  products: { total: number; published: number; draft: number };
  categories: number;
  blogPosts: { total: number; published: number; draft: number };
}

/** 与 lib/rfq.ts 相同的 API 基地址解析（服务端变量优先） */
const API_BASE = (
  process.env.ADMIN_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:4000/api/v1'
).replace(/\/$/, '');

/** 数据访问结果：调用方据此渲染错误态而非整页崩溃 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

/* ------------------------------- 内部 ------------------------------- */

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorPayload {
  success: false;
  error: { code: number; message: string | string[]; details?: unknown };
}

/** 从后端错误响应提取可读信息（class-validator 的 message 为数组，拼接展示） */
function extractErrorMessage(json: unknown, status: number): string {
  const error = (json as ApiErrorPayload | null)?.error;
  const message = error?.message;
  if (Array.isArray(message) && message.length > 0) return message.join('；');
  if (typeof message === 'string' && message) return message;
  return `请求失败（HTTP ${status}）`;
}

/**
 * 带 JWT 的请求。token 为 null 时等价于匿名请求（将得到后端 401）。
 * 超时与错误处理与 lib/rfq.ts 对齐，保证后台体验一致。
 */
export async function authorizedRequest<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    const json = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiErrorPayload | null;

    if (!response.ok || !json || json.success !== true) {
      if (response.status === 401) {
        return { ok: false, error: '登录已失效，请重新登录', status: 401 };
      }
      return { ok: false, error: extractErrorMessage(json, response.status), status: response.status };
    }

    return { ok: true, data: json.data };
  } catch (error) {
    return { ok: false, error: `无法连接后端接口：${(error as Error).message}`, status: 0 };
  }
}

/* ------------------------------- API ------------------------------- */

/** 当前登录管理员（令牌无效返回 401 结果） */
export function getCurrentAdmin(token: string | null): Promise<ApiResult<AdminProfile>> {
  return authorizedRequest<AdminProfile>('/auth/me', token);
}

/** Dashboard 真实统计 */
export function getCmsStats(token: string | null): Promise<ApiResult<CmsStats>> {
  return authorizedRequest<CmsStats>('/cms/stats', token);
}

/** 是否配置了后端地址信息（供界面提示） */
export function isApiBaseConfigured(): boolean {
  return API_BASE.trim() !== '';
}
