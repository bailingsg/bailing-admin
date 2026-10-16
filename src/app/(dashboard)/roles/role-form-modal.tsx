'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RoleListItem, RoleStatus } from '@/lib/rbac';
import { createRoleAction, updateRoleAction } from './actions';

/**
 * 角色表单弹窗（新建 / 编辑共用）。
 *
 * 新建角色默认**不带任何权限**（规格明确禁止默认全给），
 * 创建后需进入角色详情显式分配权限。
 * 编辑时可修改名称 / 描述 / 状态（启用或停用）/ 排序。
 */
export function RoleFormModal({
  mode,
  role,
}: {
  mode: 'create' | 'edit';
  role?: RoleListItem;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState(role?.name ?? '');
  const [key, setKey] = React.useState(role?.key ?? '');
  const [description, setDescription] = React.useState(role?.description ?? '');
  const [status, setStatus] = React.useState<RoleStatus>(role?.status ?? 'ACTIVE');

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setName(role?.name ?? '');
    setKey(role?.key ?? '');
    setDescription(role?.description ?? '');
    setStatus(role?.status ?? 'ACTIVE');
  }, [open, role]);

  function submit() {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError('请填写角色名称（2–50 个字符）');
      return;
    }

    startTransition(async () => {
      if (mode === 'create') {
        const trimmedKey = key.trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(trimmedKey)) {
          setError('角色标识只能包含字母、数字与下划线，且必须以字母开头');
          return;
        }
        const result = await createRoleAction({
          name: trimmedName,
          key: trimmedKey,
          description: description.trim() || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOpen(false);
        router.push(`/roles/${result.data.id}`);
        return;
      }

      if (!role) return;
      const result = await updateRoleAction(role.id, {
        name: trimmedName,
        description: description.trim() || null,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant={mode === 'create' ? 'default' : 'outline'} onClick={() => setOpen(true)}>
        {mode === 'create' ? '新建角色' : '编辑'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? '新建角色' : `编辑角色：${role?.name ?? ''}`}
        description={
          mode === 'create'
            ? '新角色默认不带任何权限，创建后请进入「权限分配」显式勾选。'
            : '停用角色后，其关联账号在下一次请求时立即失去该角色权限。'
        }
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={pending}>
              {pending ? '提交中…' : mode === 'create' ? '创建角色' : '保存修改'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormField label="角色名称" htmlFor="role-name" required>
            <Input
              id="role-name"
              value={name}
              maxLength={50}
              onChange={(event) => setName(event.target.value)}
              placeholder="如：外贸业务员"
            />
          </FormField>

          {mode === 'create' ? (
            <FormField
              label="角色标识"
              htmlFor="role-key"
              required
              hint="唯一标识，创建后不可修改。如 SALES_REP"
            >
              <Input
                id="role-key"
                value={key}
                maxLength={40}
                onChange={(event) => setKey(event.target.value)}
                placeholder="SALES_REP"
              />
            </FormField>
          ) : null}

          <FormField label="描述" htmlFor="role-description" hint="选填，说明该角色的职责范围">
            <Input
              id="role-description"
              value={description}
              maxLength={200}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="角色职责说明"
            />
          </FormField>

          {mode === 'edit' && role ? (
            <FormField label="状态" htmlFor="role-status">
              <select
                id="role-status"
                value={status}
                disabled={role.isProtected}
                onChange={(event) => setStatus(event.target.value as RoleStatus)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="ACTIVE">生效中</option>
                <option value="DISABLED">已停用</option>
              </select>
            </FormField>
          ) : null}

          {mode === 'edit' && role?.isProtected ? (
            <p className="text-caption text-text-muted">
              受保护的系统角色不可停用或修改权限。
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-small text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
