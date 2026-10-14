'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 顶栏用户区 + 登出。
 *
 * 登出 = POST /api/auth/logout（清除 HttpOnly Cookie）后回登录页。
 */
export function HeaderUser({
  email,
  role,
}: {
  email: string;
  role: 'ADMIN' | 'EDITOR';
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 即使请求失败也回登录页（Cookie 由服务端尽力清除）
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-small font-medium text-foreground">{email}</p>
        <p className="text-caption text-text-muted">{role === 'ADMIN' ? '超级管理员' : '内容编辑'}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onLogout}
        loading={loading}
        aria-label="退出登录"
      >
        <LogOut className="size-4" aria-hidden="true" />
        登出
      </Button>
    </div>
  );
}
