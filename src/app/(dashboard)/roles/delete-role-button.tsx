'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { RoleListItem } from '@/lib/rbac';
import { deleteRoleAction } from './actions';

/**
 * 删除角色按钮（两步确认）。
 *
 * 受保护角色 / 仍有关联账号的角色会被后端拒绝，这里直接禁用入口。
 */
export function DeleteRoleButton({ role }: { role: RoleListItem }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const blocked = role.isProtected || role.userCount > 0;

  if (blocked) {
    return (
      <span
        className="text-caption text-text-muted"
        title={role.isProtected ? '受保护角色不可删除' : '请先解除该角色与账号的关联'}
      >
        不可删除
      </span>
    );
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteRoleAction(role.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={remove}
          disabled={pending}
          aria-label={`确认删除角色 ${role.name}`}
        >
          {pending ? '…' : '确认删除'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          取消
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setConfirming(true)}
      >
        删除
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
