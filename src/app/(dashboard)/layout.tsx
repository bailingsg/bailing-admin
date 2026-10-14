import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';
import { HeaderUser } from '@/components/header-user';
import { getCurrentAdmin } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Dashboard 布局（认证后）。
 *
 * 鉴权链（两层）：
 *   1. middleware：会话 Cookie 存在性快速拦截（边缘层）
 *   2. 本布局：用 Cookie 中的 JWT 调后端 GET /auth/me；
 *      令牌无效 / 账号被停用 → 重定向登录页（伪造 Cookie 到此为止）
 *
 * 结构：Sidebar + Header + Content（阶段规范第十三节）。
 */
async function requireAdmin() {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const result = await getCurrentAdmin(token);
  if (!result.ok) redirect('/login');
  return result.data;
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-header-border bg-header px-4 sm:px-6">
          <p className="text-small font-semibold tracking-tight text-foreground">
            Bailing Wooden CMS
          </p>
          <HeaderUser email={admin.email} role={admin.role} />
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
