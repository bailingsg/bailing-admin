'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { setAccountStatusAction } from './actions';

/**
 * 启用 / 停用账号按钮（两步确认）。
 *
 * 规格要求「停用前两步确认」：第一次点击切换到「确认停用」，第二次才真正调用接口。
 * 受保护的系统超管账号由后端拒绝，前端直接禁用入口。
 */
export function AccountStatusButton({
  id,
  isActive,
  name,
  isProtected,
}: {
  id: string;
  isActive: boolean;
  name: string;
  isProtected: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  if (isProtected) {
    return (
      <span className="text-caption text-text-muted" title="受保护的系统账号不可停用">
        受保护
      </span>
    );
  }

  function apply() {
    setError(null);
    startTransition(async () => {
      const result = await setAccountStatusAction(id, !isActive);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={apply}
          disabled={pending}
          aria-label={`确认${isActive ? '停用' : '启用'} ${name}`}
        >
          {pending ? '…' : isActive ? '确认停用' : '确认启用'}
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
        {error ? (
          <span role="alert" className="text-caption text-destructive">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={isActive ? 'text-destructive hover:bg-destructive/10' : undefined}
        onClick={() => setConfirming(true)}
      >
        {isActive ? '停用' : '启用'}
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
