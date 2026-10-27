'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { resendRfqNotificationAction } from '../actions';

/**
 * ResendNotifyButton —— 人工补发询盘通知邮件。
 * 补发后展示结果（成功 / 失败原因），并触发服务端 revalidate 刷新通知状态。
 */
export function ResendNotifyButton({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<{ ok: boolean; text: string } | null>(null);

  function handleClick() {
    setFeedback(null);
    startTransition(async () => {
      const result = await resendRfqNotificationAction(id);
      if (result.ok && result.sent) {
        setFeedback({ ok: true, text: '通知邮件已重新发送。' });
      } else {
        setFeedback({ ok: false, text: result.error ?? '补发失败，请重试。' });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleClick}>
          {pending ? '正在补发…' : '重新发送通知'}
        </Button>
      </div>
      {feedback ? (
        <p
          role="status"
          className={
            feedback.ok ? 'text-caption text-success-600' : 'text-caption text-destructive'
          }
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
