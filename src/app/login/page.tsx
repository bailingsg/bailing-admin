import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasSession } from '@/lib/session';
import { withBasePath } from '@/lib/base-path';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: '登录',
  description: 'Bailing Wooden Admin 登录',
};

/**
 * 管理员登录页。
 * 已登录用户访问时直接进入 Dashboard（减少无意义回车）。
 *
 * `?error=` 由登录代理在**原生表单提交**（未水合 / 无 JS）失败后回填，
 * 保证这条路径也有可读提示，而不是静默失败。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasSession()) {
    redirect('/dashboard');
  }

  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border">
            <Image src={withBasePath('/logo.webp')} alt="Bailing Wooden logo" width={44} height={44} priority />
          </span>
          <div>
            <h1 className="text-heading-sm font-semibold text-foreground">Bailing Admin</h1>
            <p className="text-small text-text-secondary">百灵木业 · 管理后台</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>管理员登录</CardTitle>
            <CardDescription>请输入后台账号与口令。</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm initialError={error} />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-caption text-text-muted">
          会话有效期 15 分钟 · HttpOnly Cookie · 仅限内部使用
        </p>
      </div>
    </main>
  );
}
