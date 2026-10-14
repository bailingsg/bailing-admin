/**
 * 管理后台 —— 登录会话（服务端）。
 *
 * 会话载体：HttpOnly Cookie（`admin_session`），值为后端签发的 JWT。
 *
 * 为什么用 HttpOnly Cookie 而不是 localStorage：
 *   · localStorage 中的令牌可被任何 XSS 脚本读取，是 OAuth/JWT 泄漏的首要途径；
 *   · HttpOnly Cookie 对 document.cookie 不可见，XSS 无法直接窃取；
 *   · 令牌只在服务端读取并附加 Authorization 头转发给后端，
 *     浏览器 JS 永远接触不到令牌本身。
 *
 * 注意：Cookie 的 presence 仅用于「是否已登录」的快速判断（middleware），
 * 真正的有效性校验由后端 /auth/me 完成（见 (dashboard)/layout.tsx）。
 * 这里对 payload 的解码**不验签**，仅用于界面展示（如邮箱），
 * 伪造 payload 最多让界面显示假邮箱，数据接口仍会被后端拒绝。
 */

import { cookies } from 'next/headers';
import type { AdminRole } from './api';

/** 会话 Cookie 名称 */
export const SESSION_COOKIE = 'admin_session';

/** 会话有效期（秒）。与后端 JWT_EXPIRES_IN（默认 15m）保持一致 */
export const SESSION_MAX_AGE_SECONDS = Number.parseInt(
  process.env.ADMIN_SESSION_MAX_AGE ?? '900',
  10,
);

/** 界面展示用的会话用户（解码自 JWT payload，未验证签） */
export interface SessionUser {
  id: string;
  email: string;
  role: AdminRole;
}

/** 读取会话令牌（服务端上下文） */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** 是否存在会话（middleware / 快速判断用） */
export async function hasSession(): Promise<boolean> {
  return (await getSessionToken()) !== null;
}

/** base64url 解码（JWT payload 段） */
function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * 从 JWT 解出展示用用户信息。
 * 仅解析 payload 结构，**不做验签**；非法/过期判断交给后端。
 */
export function decodeSessionUser(token: string): SessionUser | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const json = decodeBase64Url(parts[1]!);
  if (!json) return null;

  try {
    const payload = JSON.parse(json) as Partial<SessionUser> & { sub?: string };
    if (!payload.sub || !payload.email) return null;
    return { id: payload.sub, email: payload.email, role: payload.role ?? 'EDITOR' };
  } catch {
    return null;
  }
}

/** 读取并解码当前会话用户（不存在返回 null） */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  return token ? decodeSessionUser(token) : null;
}
