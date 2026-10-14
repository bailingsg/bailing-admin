import { Badge } from '@/components/ui/badge';
import { RFQ_STATUS_LABELS, type RfqStatus } from '@/lib/rfq';

/** 状态 → 徽章变体（沿用后台设计系统的状态语义） */
const variantByStatus: Record<RfqStatus, 'info' | 'warning' | 'success' | 'muted'> = {
  NEW: 'info',
  CONTACTED: 'warning',
  QUOTED: 'success',
  CLOSED: 'muted',
};

export function RfqStatusBadge({ status }: { status: RfqStatus }) {
  return <Badge variant={variantByStatus[status]}>{RFQ_STATUS_LABELS[status]}</Badge>;
}
