import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { brandPalette } from '@/tokens';
import { withBasePath } from '@/lib/base-path';

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
  // basePath 部署（生产挂 /admin）下路径必须带前缀，否则图标 404
  icons: {
    icon: [{ url: withBasePath('/logo.webp'), type: 'image/webp' }],
    apple: [{ url: withBasePath('/logo.webp'), type: 'image/webp' }],
  },
  robots: { index: false, follow: false }, // 后台不对外收录
  // 禁止浏览器/翻译扩展自动翻译后台界面：
  // 这类扩展（沉浸式翻译等）会在页面上插入半透明覆盖层并接管点击，
  // 表现为「整页发灰、无法操作」；后台表单与按钮文案也不该被机器翻译改写
  other: { google: 'notranslate' },
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
 *
 * translate="no" + .notranslate：阻止 Chrome 内置翻译与第三方翻译扩展
 * 介入后台页面（见 metadata.other 注释）。
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" translate="no" className={`notranslate ${inter.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
