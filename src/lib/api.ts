/**
 * 管理后台 —— 带 JWT 的后端 API 访问层（服务端）。
 *
 * 全站统一：从 HttpOnly Cookie 取 JWT，以 Authorization: Bearer 调用后端
 * 受 JwtAuthGuard 保护的接口（/auth/me、/cms/stats、CMS 各模块与 RFQ）。
 * Phase 0 起 lib/rfq.ts 也复用本文件的 authorizedRequest，不再有独立令牌通道。
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
  /**
   * 生效角色的中文名（与 roles 同序同长，如 ['销售']）。
   *
   * 展示统一用这个，不要用 roles 的 key（SALES 是内部标识，不是给人看的），
   * 也不要在前端硬编码 key→名 映射表——角色名可被管理员改写，自建角色更是
   * 没有内置条目，映射表必然漂移。
   */
  roleNames: string[];
  /** 生效权限 key 全集（导航与按钮级控制唯一依据） */
  permissions: string[];
  isSuperAdmin: boolean;
  jobTitle: string | null;
  /** 我的头像地址（未上传为 null）；顶栏与账号设置页共用 */
  avatarUrl: string | null;
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

/**
 * 当前账号的角色显示名（中文，多个用「 / 」连接）。
 *
 * 唯一事实源 = 后端下发的 `roleNames`（与 roles 同序），回退到 key。
 *
 * 为什么不能拿 `roles` 的 key 当文案：`SALES` 是内部标识，给人看必须是
 * 「销售」；也不能用旧的 `role` 枚举（ADMIN/EDITOR）反推——那是 Phase 4.6
 * 之前的遗留字段，绝大多数账号都是 EDITOR，反推出来的「内容编辑」和
 * 真实角色（销售 / 超级管理员）根本对不上。
 */
export function roleDisplayName(
  profile: Pick<AdminProfile, 'roles' | 'roleNames'> | null | undefined,
): string {
  if (!profile) return '';
  const names = profile.roleNames ?? [];
  if (names.length > 0) return names.join(' / ');
  // 老后端（未下发 roleNames）时的兜底：至少别显示空白
  return (profile.roles ?? []).join(' / ');
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
 * 列表查询参数校验类错误的友好提示（class-validator 英文 → 中文业务解释）。
 *
 * 典型场景：搜索框粘贴了超长文本（如整段产品描述），超出后端 keyword 的
 * MaxLength(120) 限制被 400 拒绝。输入框已有 maxLength 防呆，但通过
 * 手动改 URL / 历史记录仍可能带入超长 keyword，此处兜底翻译。
 */
export function friendlyQueryError(message: string): string {
  if (message.includes('keyword must be shorter than or equal to')) {
    return '搜索关键词过长（最多 120 个字符），请缩短后重试';
  }
  return message;
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
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // FormData 请求让 fetch 自行生成 multipart boundary，不能强制 JSON 头
  const isFormData = init?.body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
      cache: 'no-store',
      // 上传（multipart）走 COS 时几 MB 图片很容易超过 5s，单独放宽到 60s
      signal: AbortSignal.timeout(isFormData ? 60_000 : 5000),
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

/* --------------------------- 我的资料（账号设置） --------------------------- */

/**
 * 自己的联系方式（GET/PATCH /auth/profile 的 contact 段）。
 * 刻意不含 internalNote / sortOrder / isLeadContact：那些是管理侧语义。
 */
export interface MyContact {
  displayName: string;
  jobTitle: string | null;
  displayEmail: string | null;
  whatsapp: string | null;
  phone: string | null;
  /** 头像地址（自助上传；由后端按 storageKey 动态生成，换存储/换域名仍有效） */
  avatarUrl: string | null;
  showOnSite: boolean;
}

/** 我的资料 = 账号档案 + 自己的联系方式（未创建时为 null） */
export interface MyProfile {
  profile: AdminProfile;
  contact: MyContact | null;
}

/**
 * 自助修改入参。语义与后端一致：**不传 = 不改**；传空串 = 清空该展示字段。
 * email 是登录邮箱（修改后下次登录用新邮箱），displayEmail 才是官网展示邮箱。
 */
export interface UpdateMyProfileInput {
  name?: string;
  jobTitle?: string;
  email?: string;
  displayName?: string;
  displayJobTitle?: string;
  displayEmail?: string;
  whatsapp?: string;
  phone?: string;
  showOnSite?: boolean;
}

/** 我的资料（账号设置页回填） */
export function getMyProfile(token: string | null): Promise<ApiResult<MyProfile>> {
  return authorizedRequest<MyProfile>('/auth/profile', token);
}

/** 自助修改我的资料（无需 contacts.update 权限） */
export function updateMyProfile(
  token: string | null,
  input: UpdateMyProfileInput,
): Promise<ApiResult<MyProfile>> {
  return authorizedRequest<MyProfile>('/auth/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/**
 * 自助上传 / 替换我的头像（multipart/form-data，字段名 file）。
 *
 * 直接把 FormData 交给 fetch，由它生成 boundary；**不能**转 base64 走 JSON。
 * 后端「先传新对象 → 落库 → 删除旧对象」，服务器上不会残留旧头像文件。
 */
export function uploadMyAvatar(
  token: string | null,
  formData: FormData,
): Promise<ApiResult<MyProfile>> {
  return authorizedRequest<MyProfile>('/auth/profile/avatar', token, {
    method: 'PUT',
    body: formData,
  });
}

/** 自助移除我的头像（后端同步删除存储对象，不留孤儿文件） */
export function removeMyAvatar(token: string | null): Promise<ApiResult<MyProfile>> {
  return authorizedRequest<MyProfile>('/auth/profile/avatar', token, { method: 'DELETE' });
}

/**
 * 自助修改登录口令。
 *
 * 必须带当前口令：后端校验失败返回 400（不是 401），
 * 因此不会被当成「登录失效」把人踢回登录页。
 */
export function changeMyPassword(
  token: string | null,
  input: { currentPassword: string; newPassword: string },
): Promise<ApiResult<{ changed: true }>> {
  return authorizedRequest<{ changed: true }>('/auth/change-password', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Dashboard 真实统计 */
export function getCmsStats(token: string | null): Promise<ApiResult<CmsStats>> {
  return authorizedRequest<CmsStats>('/cms/stats', token);
}

/** 是否配置了后端地址信息（供界面提示） */
export function isApiBaseConfigured(): boolean {
  return API_BASE.trim() !== '';
}
