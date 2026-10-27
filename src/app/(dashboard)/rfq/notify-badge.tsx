import { Badge } from '@/components/ui/badge';
import { RFQ_NOTIFY_LABELS, type RfqNotifyStatus } from '@/lib/rfq';

/** 通知状态 → 徽章变体：已发送=成功绿、待发送=警告黄、失败=危险红 */
const variantByStatus: Record<RfqNotifyStatus, 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning',
  SENT: 'success',
  FAILED: 'destructive',
};

export function RfqNotifyBadge({ status }: { status: RfqNotifyStatus }) {
  return <Badge variant={variantByStatus[status]}>{RFQ_NOTIFY_LABELS[status]}</Badge>;
}
