import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { brandPalette } from '@/tokens';

/** 字体与主站一致：Inter（拉丁）+ 中文回退栈（见设计令牌 --font-sans） */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3001'),
  title: {
    default: 'Bailing Wooden Admin - 百灵木业管理后台',
    template: '%s | Bailing Wooden Admin',
  },
  description:
    'Bailing Wooden B2B website admin console. Internal management interface — not for public indexing.',
  // 站点图标：复用品牌 logo，避免浏览器默认请求 /favicon.ico 产生 404
  icons: {
    icon: [{ url: '/logo.webp', type: 'image/webp' }],
    apple: [{ url: '/logo.webp', type: 'image/webp' }],
  },
  robots: { index: false, follow: false }, // 后台不对外收录
};

export const viewport: Viewport = {
  themeColor: brandPalette.woodBrown,
  width: 'device-width',
  initialScale: 1,
};

/**
 * 根布局。
 *
 * Phase 4.1 起 Sidebar / Header 由 (dashboard) 路由组布局提供：
 * 登录页（/login）等公开页保持无侧边栏的干净布局。
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
