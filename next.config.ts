import type { NextConfig } from 'next';

/**
 * 并行会话隔离：另一会话正在 3001 端口运行本仓库的 admin 实例，
 * 其 .next 目录被占用会导致本机构建 EPERM。通过 distDir 环境变量
 * 支持临时切换构建目录（验收时使用 .next-visitor，用后即弃）。
 */
const distDir = process.env.ADMIN_DIST_DIR ?? '.next';

const nextConfig: NextConfig = { distDir };

export default nextConfig;
