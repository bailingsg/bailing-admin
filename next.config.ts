import type { NextConfig } from 'next';

/**
 * 并行会话隔离：ADMIN_DIST_DIR 可临时切换构建目录（本地验收用，服务器不设置）。
 *
 * basePath：生产后台挂在 80 端口的 /admin 子路径下（腾讯云安全组未放行 3001，
 * 公网只能走已放行的 80）。取值来自 NEXT_PUBLIC_BASE_PATH，与
 * src/lib/base-path.ts 的 withBasePath() 共用同一个变量，保证两处永远一致：
 *   · 本地开发 / 本机构建：不设该变量 → 无 basePath（直接访问 :3001/...）
 *   · 生产镜像：构建时 --build-arg NEXT_PUBLIC_BASE_PATH=/admin，
 *     且 compose 的 admin.environment 里同样设置（next start 会重新读取
 *     本文件来装配路由，运行时缺这个变量会退化成无 basePath → 全站 404）
 *
 * 注意：basePath 是构建期固化进 .next 的，改值必须重新 build，改 env 无效。
 */
const distDir = process.env.ADMIN_DIST_DIR ?? '.next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  distDir,
  ...(basePath ? { basePath } : {}),
  /**
   * Server Actions 请求体上限。
   *
   * 媒体库上传经服务端 Action 透传 multipart，Next 默认 1MB：
   * 超过即抛 "Body exceeded 1 MB limit" → 整页 Application error
   * （digest 1246829881，2026-10-23 线上复现）。
   * 后台媒体上限为 10MB（MEDIA_MAX_SIZE_MB），取 12mb 留 multipart 余量；
   * nginx 侧 client_max_body_size 已是 20m，不构成瓶颈。
   */
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
