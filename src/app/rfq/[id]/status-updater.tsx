'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RFQ_STATUSES, RFQ_STATUS_LABELS, type RfqStatus } from '@/lib/rfq';
import { updateRfqStatusAction } from '../actions';

/**
 * StatusUpdater —— 询盘状态流转控件。
 * 仅展示与当前状态不同的目标状态，避免无意义的重复提交。
 */
export function StatusUpdater({ id, current }: { id: string; current: RfqStatus }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleUpdate(status: RfqStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateRfqStatusAction(id, status);
      if (!result.ok) setError(result.error ?? '更新失败，请重试。');
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {RFQ_STATUSES.map((status) => {
          const active = status === current;
          return (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={active ? 'primary' : 'outline'}
              disabled={pending || active}
              aria-current={active ? 'true' : undefined}
              onClick={() => handleUpdate(status)}
            >
              {RFQ_STATUS_LABELS[status]}
            </Button>
          );
        })}
      </div>
      {pending ? <p className="text-caption text-text-muted">正在更新…</p> : null}
      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
