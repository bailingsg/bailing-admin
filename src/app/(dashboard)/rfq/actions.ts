'use server';

import { revalidatePath } from 'next/cache';
import { RFQ_STATUSES, resendRfqNotification, updateRfqStatus, type RfqStatus } from '@/lib/rfq';
import { getSessionToken } from '@/lib/session';

export interface RfqActionState {
  ok: boolean;
  error?: string;
}

/** 补发通知的结果：ok 表示请求本身成功，sent 表示邮件确实发出 */
export interface RfqResendActionState {
  ok: boolean;
  sent?: boolean;
  error?: string;
}

/**
 * 更新询盘状态（NEW → CONTACTED → QUOTED → CLOSED）。
 *
 * 服务端 Action：在后端完成 PATCH 后刷新列表与详情页缓存。
 */
export async function updateRfqStatusAction(
  id: string,
  status: RfqStatus,
): Promise<RfqActionState> {
  if (!id || !(RFQ_STATUSES as string[]).includes(status)) {
    return { ok: false, error: '参数不合法' };
  }

  const token = await getSessionToken();
  const result = await updateRfqStatus(token, id, status);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/rfq');
  revalidatePath(`/rfq/${id}`);
  return { ok: true };
}

/**
 * 人工补发询盘通知邮件。
 *
 * 与自动首发共用同一条后端链路（收件人规则、模板、失败重试），
 * 补发后刷新列表与详情，使「通知」状态即时更新。
 */
export async function resendRfqNotificationAction(id: string): Promise<RfqResendActionState> {
  if (!id) return { ok: false, error: '参数不合法' };

  const token = await getSessionToken();
  const result = await resendRfqNotification(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/rfq');
  revalidatePath(`/rfq/${id}`);

  if (!result.data.sent) {
    return {
      ok: true,
      sent: false,
      error: result.data.error ?? result.data.reason ?? '发送失败，请查看后端日志',
    };
  }
  return { ok: true, sent: true };
}
