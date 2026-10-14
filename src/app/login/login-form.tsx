'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * 登录表单（客户端组件）。
 *
 * 提交到同源路由 POST /api/auth/login（服务端代为转发后端并写入
 * HttpOnly Cookie）——浏览器 JS 不接触 JWT 本体。
 * 成功跳转 /dashboard（或 next 参数指定的原目标页）；
 * 凭证错误显示阶段规范要求的统一文案 Invalid email or password。
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // 服务端已设置 HttpOnly Cookie；跳转到原目标页或 Dashboard
        const target = next && next.startsWith('/') ? next : '/dashboard';
        router.replace(target);
        router.refresh();
        return;
      }

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? 'Invalid email or password');
    } catch {
      setError('无法连接登录服务，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-label="管理员登录">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="admin@bailingwooden.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
        />
      </div>

      {/* 错误提示区：aria-live 保证读屏软件可播报 */}
      <div aria-live="polite">
        {error ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" fullWidth loading={loading} disabled={loading}>
        {loading ? 'Signing in…' : 'Login'}
      </Button>
    </form>
  );
}
