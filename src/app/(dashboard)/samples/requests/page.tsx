import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  SAMPLE_REQUEST_STATUS_LABELS,
  getSampleProfile,
  isAdminProfile,
  listSampleRequests,
  type SampleRequestItem,
  type SampleRequestScope,
  type SampleRequestStatus,
} from '@/lib/samples';
import { RequestActions } from './request-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '出库申请',
  description: '待审批与历史出库申请。',
};

const PAGE_SIZE = 20;

const SCOPES: { key: SampleRequestScope; label: string; adminOnly?: boolean }[] = [
  { key: 'pending', label: '待我审批' },
  { key: 'mine', label: '我的申请' },
  { key: 'all', label: '全部申请', adminOnly: true },
];

const STATUS_VARIANTS: Record<SampleRequestStatus, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'muted',
};

/**
 * 出库申请列表（Phase 5.1）。
 *
 * · 待我审批：持有人看到的针对自己样品的待审批申请（可审批）
 * · 我的申请：申请人自己发起的申请（可撤回）
 * · 全部申请：仅管理员
 */
export default async function SampleRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; page?: string }>;
}) {
  const params = await searchParams;
  const scope = (['pending', 'mine', 'all'] as string[]).includes(params.scope ?? '')
    ? (params.scope as SampleRequestScope)
    : 'pending';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const token = await getSessionToken();
  const me = await getSampleProfile(token);
  if (!me.ok) {
    return (
      <Container width="page" className="py-8">
        <p className="text-small text-text-secondary">无法读取当前账号信息。</p>
      </Container>
    );
  }
  const admin = isAdminProfile(me.data);

  const result = await listSampleRequests(token, scope, { page, limit: PAGE_SIZE });
  const items = result.ok ? result.data.items : [];

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="出库申请"
        description="样品出库申请、审批与历史记录。同意出库后样品将从正常列表移除并归档。"
        breadcrumb={
          <Link href="/samples" className="text-small text-primary hover:underline">
            返回样品列表
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {SCOPES.filter((s) => !s.adminOnly || admin).map((s) => (
          <Link
            key={s.key}
            href={`/samples/requests?scope=${s.key}`}
            className={
              scope === s.key
                ? 'inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-small font-medium text-primary-foreground'
                : 'inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small text-foreground hover:bg-accent'
            }
          >
            {s.label}
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="py-8">
            <p className="text-body font-medium text-foreground">无法加载申请列表</p>
            <p className="mt-1 text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无申请记录</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {items.map((item: SampleRequestItem) => {
              // 持有人可审批针对自己样品的申请
              const canDecide = scope === 'pending' && item.ownerId === me.data.id;
              const isMine = item.requesterId === me.data.id;
              return (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-2 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/samples/${item.sampleId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.sampleCode} · {item.sampleName}
                        </Link>
                        <Badge variant={STATUS_VARIANTS[item.status]}>
                          {SAMPLE_REQUEST_STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small sm:grid-cols-4">
                        <div>
                          <dt className="text-text-muted">申请人</dt>
                          <dd className="text-foreground">{item.requesterName ?? item.requesterId}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">持有人</dt>
                          <dd className="text-foreground">{item.ownerName ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">申请时间</dt>
                          <dd className="text-foreground">{formatDateTime(item.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">处理时间</dt>
                          <dd className="text-foreground">
                            {item.decidedAt ? formatDateTime(item.decidedAt) : '—'}
                          </dd>
                        </div>
                        <div className="col-span-2 sm:col-span-4">
                          <dt className="text-text-muted">申请说明</dt>
                          <dd className="text-foreground">{item.purpose}</dd>
                        </div>
                      </dl>
                      {item.status === 'PENDING' && (canDecide || isMine) ? (
                        <div className="flex items-center gap-2 pt-1">
                          <RequestActions request={item} canDecide={canDecide} />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Container>
  );
}
