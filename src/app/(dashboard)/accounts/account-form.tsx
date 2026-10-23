'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/modal';
import type { AccountDetail, AssignableRole } from '@/lib/rbac';
import { createAccountAction, fetchAssignableRolesAction, updateAccountAction } from './actions';

/**
 * 账号表单（新建 / 编辑共用）。
 *
 * 校验规则与后端 CreateAccountDto / UpdateAccountDto 一致：
 *   · 姓名 2–50 字符；登录邮箱必填且唯一性由后端校验
 *   · 至少一个角色（无角色账号登录后没有任何功能）
 *   · 操作人无权分配的角色会禁用勾选（提权防护在后端同样强制）
 *   · 初始口令可选：留空由后端生成强随机口令，仅在创建响应中返回一次
 */
export function AccountForm({
  mode,
  account,
}: {
  mode: 'create' | 'edit';
  account?: AccountDetail;
}) {
  const router = useRouter();
  const [roles, setRoles] = React.useState<AssignableRole[]>([]);
  const [loadingRoles, setLoadingRoles] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [initialPassword, setInitialPassword] = React.useState<string | null>(null);

  const [name, setName] = React.useState(account?.name ?? '');
  const [email, setEmail] = React.useState(account?.email ?? '');
  const [jobTitle, setJobTitle] = React.useState(account?.jobTitle ?? '');
  const [okkiAccount, setOkkiAccount] = React.useState(account?.okkiAccount ?? '');
  const [alibabaAccount, setAlibabaAccount] = React.useState(account?.alibabaAccount ?? '');
  const [roleIds, setRoleIds] = React.useState<string[]>(
    account?.roles.map((role) => role.id) ?? [],
  );
  const [password, setPassword] = React.useState('');
  const [isActive, setIsActive] = React.useState(account?.isActive ?? true);

  React.useEffect(() => {
    let alive = true;
    void fetchAssignableRolesAction().then((result) => {
      if (!alive) return;
      setLoadingRoles(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRoles(result.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  function toggleRole(id: string) {
    setRoleIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function submit() {
    setError(null);
    setInitialPassword(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError('请填写姓名（2–50 个字符）');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('请填写登录邮箱');
      return;
    }
    if (roleIds.length === 0) {
      setError('请至少选择一个角色（无角色账号登录后无法使用任何功能）');
      return;
    }
    if (mode === 'create' && password && (password.length < 8 || password.length > 72)) {
      setError('初始口令长度需在 8–72 个字符之间');
      return;
    }

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createAccountAction({
          name: trimmedName,
          email: trimmedEmail,
          jobTitle: jobTitle.trim() || undefined,
          okkiAccount: okkiAccount.trim() || undefined,
          alibabaAccount: alibabaAccount.trim() || undefined,
          roleIds,
          initialPassword: password || undefined,
          isActive,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setInitialPassword(result.data.initialPassword);
        return;
      }

      if (!account) return;
      const result = await updateAccountAction(account.id, {
        name: trimmedName,
        email: trimmedEmail,
        jobTitle: jobTitle.trim() || null,
        okkiAccount: okkiAccount.trim() || null,
        alibabaAccount: alibabaAccount.trim() || null,
        roleIds,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/accounts');
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="姓名" htmlFor="account-name" required>
          <Input
            id="account-name"
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            placeholder="员工姓名"
          />
        </FormField>
        <FormField
          label="登录邮箱"
          htmlFor="account-email"
          required
          hint="员工登录后台使用的邮箱，同时作为账号唯一标识"
        >
          <Input
            id="account-email"
            type="email"
            value={email}
            maxLength={120}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
          />
        </FormField>
        <FormField label="职位" htmlFor="account-job-title" hint="选填，如外贸业务经理">
          <Input
            id="account-job-title"
            value={jobTitle}
            maxLength={80}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="职位名称"
          />
        </FormField>
        <FormField label="小满账号" htmlFor="account-okki" hint="选填，该员工的小满（OKKI）CRM 账号">
          <Input
            id="account-okki"
            value={okkiAccount}
            maxLength={80}
            onChange={(event) => setOkkiAccount(event.target.value)}
            placeholder="小满（OKKI）登录账号"
          />
        </FormField>
        <FormField label="阿里账号" htmlFor="account-alibaba" hint="选填，该员工的阿里巴巴账号">
          <Input
            id="account-alibaba"
            value={alibabaAccount}
            maxLength={80}
            onChange={(event) => setAlibabaAccount(event.target.value)}
            placeholder="阿里巴巴登录账号"
          />
        </FormField>
        {mode === 'create' ? (
          <FormField
            label="初始口令"
            htmlFor="account-password"
            hint="留空由系统生成强随机口令（创建后仅显示一次）"
          >
            <Input
              id="account-password"
              type="text"
              value={password}
              maxLength={72}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8–72 个字符"
            />
          </FormField>
        ) : null}
      </div>

      {/* 角色 */}
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium text-foreground">
          角色<span className="ml-1 text-destructive">*</span>
        </span>
        {loadingRoles ? (
          <p className="text-small text-text-secondary">加载角色列表…</p>
        ) : roles.length === 0 ? (
          <p className="text-small text-text-secondary">
            暂无可分配角色，请先到「角色与权限」创建角色。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roles.map((role) => (
              <li
                key={role.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <label className="flex flex-1 items-center gap-2 text-small text-foreground">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    disabled={!role.assignable}
                    className="size-4 accent-[var(--primary)]"
                    aria-label={`分配角色 ${role.name}`}
                  />
                  <span className="font-medium">{role.name}</span>
                  <span className="text-caption text-text-muted">{role.key}</span>
                </label>
                <Badge variant="outline">{role.permissionCount} 项权限</Badge>
                {role.assignable ? null : (
                  <Badge variant="destructive">超出自身权限，不可分配</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {mode === 'create' ? (
        <label className="flex items-center gap-2 text-small text-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          创建后立即启用（取消勾选则创建为停用状态）
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      {initialPassword ? (
        <div className="flex flex-col gap-2 rounded-md border border-success-600/40 bg-success-50 px-4 py-3">
          <p className="text-small font-medium text-foreground">
            账号已创建，请立即复制初始口令并转交员工：
          </p>
          <p className="font-mono text-body font-semibold text-foreground">{initialPassword}</p>
          <p className="text-caption text-text-muted">
            该口令仅此一次显示，刷新或离开页面后无法再次查看；员工登录后请尽快修改。
          </p>
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/accounts">返回账号列表</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={submit} disabled={pending || loadingRoles}>
            {pending ? '提交中…' : mode === 'create' ? '创建账号' : '保存修改'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            disabled={pending}
          >
            取消
          </Button>
        </div>
      )}
    </div>
  );
}
