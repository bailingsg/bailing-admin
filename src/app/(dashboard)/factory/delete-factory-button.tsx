'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteFactorySectionAction } from './actions';

/**
 * 删除工厂分区按钮（列表行 / 编辑页，客户端）。
 *
 * 两步确认（「删除」→「确认」），不使用浏览器原生 confirm()；
 * 删除请求经服务端 Action 转发（JWT 不出服务端）。
 * 删除仅解除媒体关联，不会删除媒体库中的文件。
 */
export function DeleteFactoryButton({
  id,
  title,
  onDeleted,
  redirectTo,
}: {
  id: string;
  title: string;
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
      const result = await deleteFactorySectionAction(id);
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
            aria-label={`确认删除 ${title}`}
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
        <span className="text-caption text-text-muted">删除后不影响媒体库文件</span>
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
