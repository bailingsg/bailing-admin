'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Plan } from '@/lib/lead-distribution';
import { closePlanAction, resumePlanAction } from '../actions';

/**
 * 计划详情页操作区（Phase 4.6）。
 *
 * 按计划状态切换可用操作：
 *   · ACTIVE            → 「手动关闭计划」（两步确认，关闭弹窗 ≠ 关闭计划）
 *   · 冷却暂停（isPendingResume）→ 「恢复计划」（立即恢复执行）
 *   · COMPLETED / CLOSED（无恢复时间）→ 无可执行操作
 *
 * 关闭与恢复均调用后端接口，成功后刷新服务端渲染的数据。
 */
export function PlanActions({ plan, canClose }: { plan: Plan; canClose: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setConfirming(false);
    setError(null);
  }, [plan.id, plan.status]);

  if (!canClose) return null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? '操作失败');
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (plan.status === 'ACTIVE') {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-2">
          {confirming ? (
            <>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => run(() => closePlanAction(plan.id))}
              >
                {pending ? '关闭中…' : '确认关闭'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                取消
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirming(true)}
            >
              手动关闭计划
            </Button>
          )}
        </span>
        {error ? (
          <span role="alert" className="text-caption text-destructive">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  if (plan.isPendingResume) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => resumePlanAction(plan.id))}
        >
          {pending ? '恢复中…' : '恢复计划'}
        </Button>
        {error ? (
          <span role="alert" className="text-caption text-destructive">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  return null;
}
