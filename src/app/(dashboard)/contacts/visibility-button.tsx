'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { setContactVisibilityAction } from './actions';

/**
 * 切换公开展示按钮。
 *
 * 与「编辑联系方式」解耦：仅切换官网是否展示该联系人。
 * 注意：重新启用展示不会自动改变员工的询盘联系资格（两件事互不影响）。
 */
export function ContactVisibilityButton({
  id,
  showOnSite,
}: {
  id: string;
  showOnSite: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setContactVisibilityAction(id, !showOnSite);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {pending ? '…' : showOnSite ? '取消展示' : '恢复展示'}
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
