'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteApplicationAction } from './actions';

/**
 * 删除应用场景按钮（列表行 / 编辑页，客户端）。
 * 两步确认，不使用原生 confirm()；删除仅解除产品关联，不删除产品。
 */
export function DeleteApplicationButton({
  id,
  name,
  onDeleted,
  redirectTo,
}: {
  id: string;
  name: string;
  onDeleted?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteApplicationAction(id);
      if (!result.ok) {
        setError(result.error ?? '删除失败');
        return;
      }
      setConfirming(false);
      if (onDeleted) onDeleted();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1.5">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
            aria-label={`确认删除 ${name}`}
          >
            {pending ? '…' : '确认'}
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
        <span className="text-caption text-text-muted">删除后不影响已关联的产品</span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10"
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
