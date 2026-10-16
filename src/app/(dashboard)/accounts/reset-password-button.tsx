'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { resetPasswordAction } from './actions';

/**
 * 重置口令按钮。
 *
 * 两步确认：第一次点击切换确认态，第二次调用后端生成新口令。
 * 新口令明文只在响应里出现一次，这里立即展示给操作人转交员工；
 * 关闭提示后任何接口都无法再次取回该口令。
 */
export function ResetPasswordButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState<string | null>(null);

  function reset() {
    setError(null);
    setNewPassword(null);
    startTransition(async () => {
      const result = await resetPasswordAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      setNewPassword(result.data.initialPassword);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {confirming ? (
        <span className="inline-flex items-center gap-1.5">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={reset}
            disabled={pending}
            aria-label={`确认重置 ${name} 的口令`}
          >
            {pending ? '…' : '确认重置'}
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
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          重置口令
        </Button>
      )}

      {newPassword ? (
        <span className="rounded-md border border-warning-600/40 bg-warning-50 px-2 py-1 text-caption text-foreground">
          新口令：<span className="font-mono font-medium">{newPassword}</span>
          （仅显示一次，请立即转交）
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-caption text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
