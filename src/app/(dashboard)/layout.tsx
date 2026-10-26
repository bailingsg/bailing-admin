import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';
import { HeaderUser } from '@/components/header-user';
import { ToastHost } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentAdmin, hasPermission, roleDisplayName } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { PATHNAME_HEADER, requiredPermissionsFor } from '@/lib/route-permissions';

export const dynamic = 'force-dynamic';

/**
 * Dashboard 布局（认证后）。
 *
 * 鉴权链（三层）：
 *   1. middleware：会话 Cookie 存在性快速拦截（边缘层）+ 注入当前路径头
 *   2. 本布局：用 Cookie 中的 JWT 调后端 GET /auth/me；
 *      令牌无效 / 账号被停用 → 重定向登录页（伪造 Cookie 到此为止）
 *   3. 本布局：按 `route-permissions.ts` 的映射做**路由级权限守卫**
 *      ——侧栏隐藏了入口，直接输 URL 也必须拦得住（BUG-06）
 *
 * 第 3 层是界面层守卫，不是安全边界：真正的边界在后端 PermissionsGuard，
 * 越权调接口仍会 403。这里的作用是让越权访问得到明确提示，而不是渲染一个
 * 满屏报错的空壳页面。
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

/** 无权限提示（保留侧栏与顶栏，避免用户"掉出"后台） */
function NoAccess({ permissionKeys }: { permissionKeys: string[] }) {
  return (
    <div className="p-4 sm:p-6">
      <Card>
        <CardContent className="flex flex-col gap-3 py-10">
          <p className="text-body font-medium text-foreground">没有访问权限</p>
          <p className="text-small text-text-secondary">
            当前账号缺少访问该页面所需的权限
            {permissionKeys.length > 0 ? `（${permissionKeys.join(' / ')}）` : ''}。
            如需开通，请联系管理员在「角色与权限」中调整。
          </p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">返回概览</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  // 中间件注入的当前路径（客户端自带同名头会被覆盖，不能用于绕过）
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? '';
  const required = requiredPermissionsFor(pathname);
  const permitted: boolean =
    required === null || required.length === 0 || required.some((key) => hasPermission(admin, key));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar permissions={admin.permissions ?? []} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-header-border bg-header px-4 sm:px-6">
          <p className="text-small font-semibold tracking-tight text-foreground">
            Bailing Wooden CMS
          </p>
          <HeaderUser
            email={admin.email}
            roleName={roleDisplayName(admin)}
            name={admin.name}
            avatarUrl={admin.avatarUrl}
          />
        </header>
        <main className="min-w-0 flex-1">
          {permitted ? children : <NoAccess permissionKeys={required ?? []} />}
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
