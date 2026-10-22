'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { withBasePath } from '@/lib/base-path';

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

    // 以表单 DOM 实际值为准，而不是受控 state：
    // 浏览器密码管理器 / 自动填充（Chrome、Safari、1Password 等）写入 input
    // 时不一定会派发 React 能捕获的 input 事件，state 可能仍是空串，
    // 结果把空邮箱提交给后端 → ValidationPipe 400。FormData 直接读 DOM，
    // 不受此影响。读取后同步回 state，保证后续渲染与提交一致。
    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get('email') ?? '').trim();
    const passwordValue = String(formData.get('password') ?? '');
    if (emailValue !== email) setEmail(emailValue);
    if (passwordValue !== password) setPassword(passwordValue);

    if (!emailValue || !passwordValue) {
      setError('请输入邮箱与口令');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });

      if (response.ok) {
        // 服务端已设置 HttpOnly Cookie；跳转到原目标页或 Dashboard
        const target = next && next.startsWith('/') ? next : '/dashboard';
        router.replace(target);
        router.refresh();
        return;
      }

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(translateLoginError(json?.error, response.status));
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
          邮箱
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
          口令
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
        {loading ? '登录中…' : '登录'}
      </Button>
    </form>
  );
}

/**
 * 登录错误文案中文化（后台统一中文）。
 *
 * 按 HTTP 状态码给语义，不把「输入不合法」误报成「服务异常」：
 *   · 400 → 邮箱或口令格式不正确（后端 ValidationPipe 校验失败）
 *   · 401 → 邮箱或口令错误（后端统一文案，不区分账号不存在与口令错误）
 *   · 5xx → 服务端异常，提示稍后重试
 */
function translateLoginError(raw: string | undefined, status: number): string {
  if (status === 400) return '邮箱或口令格式不正确，请检查后重试';
  if (status === 401) return '邮箱或口令错误';
  if (status >= 500) return '后端登录服务异常，请稍后重试';
  if (!raw) return '邮箱或口令错误';
  if (/invalid email or password/i.test(raw)) return '邮箱或口令错误';
  return raw;
}
