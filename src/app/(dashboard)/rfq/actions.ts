'use server';

import { revalidatePath } from 'next/cache';
import { RFQ_STATUSES, updateRfqStatus, type RfqStatus } from '@/lib/rfq';
import { getSessionToken } from '@/lib/session';

export interface RfqActionState {
  ok: boolean;
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
