'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { withBasePath } from '@/lib/base-path';

/**
 * 顶栏用户区：姓名/邮箱可点击 → 下拉（账号设置 / 登出）。
 *
 * 交互约定：
 *   · 点击触发区开合；点击外部或按 Esc 关闭（菜单不劫持页面滚动）
 *   · 菜单用 role="menu"，触发器带 aria-haspopup / aria-expanded
 *   · 登出 = POST /api/auth/logout（清除 HttpOnly Cookie）后回登录页，
 *     仍保留在菜单内（顶栏不再单独放「登出」按钮，减少误触）
 */
export function HeaderUser({
  email,
  role,
  name,
  avatarUrl,
}: {
  email: string;
  role: 'ADMIN' | 'EDITOR';
  name?: string | null;
  /** 我的头像（未上传时显示姓名首字母占位） */
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const initial = (name ?? email ?? '').trim().slice(0, 1).toUpperCase() || '?';

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch(withBasePath('/api/auth/logout'), { method: 'POST' });
    } catch {
      // 即使请求失败也回登录页（Cookie 由服务端尽力清除）
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="header-user-menu"
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1 text-right transition-colors',
          'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          open && 'bg-accent',
        )}
      >
        {/* 头像：上传后立即反映，同时提示「这里能点」 */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            className="size-8 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-small font-medium text-text-secondary"
          >
            {initial}
          </span>
        )}
        <span className="hidden flex-col sm:flex">
          <span className="text-small font-medium text-foreground">{email}</span>
          <span className="text-caption text-text-muted">
            {role === 'ADMIN' ? '超级管理员' : '内容编辑'}
          </span>
        </span>
        {/* 窄屏只显示图标区，避免顶栏被长邮箱撑破 */}
        <span className="flex flex-col sm:hidden">
          <span className="text-small font-medium text-foreground">账号</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-text-muted transition-transform duration-[var(--duration-fast)]',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id="header-user-menu"
          role="menu"
          aria-label="账号菜单"
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-small font-medium text-foreground">{name || email}</p>
            <p className="truncate text-caption text-text-muted">{email}</p>
          </div>

          <Link
            href="/settings/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-small text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <UserCog className="size-4 text-text-muted" aria-hidden="true" />
            账号设置
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={loading}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-small text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-60"
          >
            <LogOut className="size-4 text-text-muted" aria-hidden="true" />
            {loading ? '正在登出…' : '登出'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
