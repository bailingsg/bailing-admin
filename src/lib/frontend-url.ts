/**
 * 前台站点地址拼接（「查看线上页面」等跳转用）。
 *
 * 背景：后台与前台**不同源**——本地 :3001 vs :3000，生产
 * admin.bailingwooden.com vs bailingwooden.com。跳转链接若用相对路径
 * （`/products/xxx`），浏览器会按**后台自己的 origin** 解析 → 404。
 * 这里统一拼成指向前台的绝对 URL。
 *
 * 语言前缀：默认语言（英文）无前缀，直接打开即规范 URL，无需补 /en。
 */

/** 前台基地址（NEXT_PUBLIC_，构建期内联；本地默认 :3000） */
const RAW_BASE = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';

export const FRONTEND_URL = RAW_BASE.replace(/\/+$/, '');

/**
 * 拼装前台绝对地址。
 *
 * @param path 站内路径（以 `/` 开头），如 `/products/<slug>-<id>`
 */
export function frontendUrl(path: string): string {
  if (!path) return FRONTEND_URL;
  return `${FRONTEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
