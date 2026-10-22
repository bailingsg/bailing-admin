/**
 * 部署 basePath（与 next.config.ts 的 basePath 保持一致）。
 *
 * 生产环境后台挂在 80 端口的 `/admin` 子路径下（腾讯云安全组未放行 3001），
 * 构建时通过 `NEXT_PUBLIC_BASE_PATH=/admin` 注入；本地开发不设置 → 空串。
 *
 * 为什么需要它：Next 的 `<Link>` / `router.push()` / `redirect()` 会自动补
 * basePath，但**浏览器里的原生 `fetch('/api/...')` 不会**——在 basePath 下
 * 这类请求会打到根路径而 404。凡是客户端直接 fetch 同源 API 的地方，
 * 都必须用 `apiPath()` 拼前缀。
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** 把站内绝对路径拼上 basePath（`/api/auth/login` → `/admin/api/auth/login`） */
export function withBasePath(path: string): string {
  if (!BASE_PATH) return path;
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
