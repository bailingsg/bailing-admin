'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { resendRfqNotificationAction } from './actions';

/**
 * 列表内快速补发通知。
 *
 * 与详情页的补发按钮共用同一个服务端 Action，补发成功后服务端会 revalidate 列表，
 * 因此「通知」列的状态徽章会自动刷新，无需手动刷新页面。
 */
export function QuickResendButton({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  function handleClick() {
    setFeedback(null);
    startTransition(async () => {
      const result = await resendRfqNotificationAction(id);
      if (result.ok && result.sent) {
        setFailed(false);
        setFeedback('已补发');
      } else {
        setFailed(true);
        setFeedback(result.error ?? '补发失败');
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={handleClick}>
        {pending ? '补发中…' : '补发'}
      </Button>
      {feedback ? (
        <span
          role="status"
          className={`text-caption ${failed ? 'text-destructive' : 'text-success-600'}`}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}
