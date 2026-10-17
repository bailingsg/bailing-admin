import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  SAMPLE_STATUS_LABELS,
  getSample,
  getSampleProfile,
  isAdminProfile,
  listSampleLogs,
  type SampleDetail,
} from '@/lib/samples';
import { SampleFormModal } from '@/app/(dashboard)/samples/sample-form';
import { SampleActions } from './sample-actions';
import { GrantPanel } from './grant-panel';
import { listAccounts } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '样品详情',
  description: '样品信息、授权名单与出库申请处理。',
};

const SAMPLE_ACTION_LABELS: Record<string, string> = {
  'sample.create': '录入样品',
  'sample.update': '编辑样品',
  'sample.grant': '授权查看',
  'sample.grant.revoke': '撤销授权',
  'sample.request.create': '发起出库申请',
  'sample.request.withdraw': '撤回申请',
  'sample.request.reject': '拒绝出库',
  'sample.request.approve': '同意出库（归档）',
};

/**
 * 样品详情（Phase 5.1）。
 *
 * 按钮按身份渲染：持有人可见编辑与审批；被授权业务员可见申请出库；
 * 管理员可见授权管理；申请人可撤回自己的待审批申请。
 * 真正权限判定全部在后端。
 */
export default async function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  const [me, result] = await Promise.all([getSampleProfile(token), getSample(token, id)]);
  if (!me.ok) notFound();
  if (!result.ok) notFound();

  const sample: SampleDetail = result.data;
  const admin = isAdminProfile(me.data);
  const isOwner = sample.ownerId === me.data.id;
  const granted = sample.grants.some((g) => g.granteeId === me.data.id);
  const pending = sample.pendingRequest;
  const isRequester = pending?.requesterId === me.data.id;

  const logs = await listSampleLogs(token, id);

  // 授权候选：全部在职账号（仅管理员找得到此接口，失败时静默为空）
  let candidates: { id: string; label: string }[] = [];
  if (admin) {
    const accounts = await listAccounts(token, { isActive: true, limit: 100 });
    if (accounts.ok) {
      candidates = accounts.data.items.map((a) => ({
        id: a.id,
        label: a.name ? `${a.name}（${a.email}）` : a.email,
      }));
    }
  }

  const statusVariant =
    sample.status === 'IN_STOCK'
      ? 'success'
      : sample.status === 'REQUEST_OUT'
        ? 'warning'
        : sample.status === 'REJECTED'
          ? 'destructive'
          : 'muted';

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={sample.name}
        description={`样品编号 ${sample.code} · 持有人 ${sample.ownerName ?? '—'}`}
        breadcrumb={
          <Link href="/samples" className="text-small text-primary hover:underline">
            返回样品列表
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? <SampleFormModal mode="edit" sample={sample} /> : null}
            <SampleActions
              sample={sample}
              isOwner={isOwner}
              granted={granted}
              isRequester={isRequester}
            />
          </div>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* 样品信息 */}
        <Card className="lg:col-span-2">
          <CardContent className="py-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Info label="样品编号" value={sample.code} />
              <Info label="样品名称" value={sample.name} />
              <Info label="产品型号 / 规格" value={sample.spec} />
              <Info label="材质" value={sample.material} />
              <Info label="用途" value={sample.usage} />
              <Info
                label="数量"
                value={`${sample.quantity} ${sample.unit}`}
              />
              <Info label="存放位置" value={sample.location} />
              <Info label="持有人" value={sample.ownerName ?? '—'} />
              <div>
                <dt className="text-caption text-text-muted">当前状态</dt>
                <dd className="mt-0.5">
                  <Badge variant={statusVariant}>{SAMPLE_STATUS_LABELS[sample.status]}</Badge>
                </dd>
              </div>
              <Info label="创建时间" value={formatDateTime(sample.createdAt)} />
              <div className="sm:col-span-2">
                <dt className="text-caption text-text-muted">备注</dt>
                <dd className="mt-0.5 text-small text-foreground">{sample.remark ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* 授权名单（管理员可管理；其他角色只读） */}
        <GrantPanel sample={sample} isAdmin={admin} candidates={candidates} />
      </div>

      {/* 审批弹窗由 SampleActions 触发；这里展示待审批申请 */}
      {pending ? (
        <Card className="mt-4">
          <CardContent className="py-5">
            <h2 className="text-body font-semibold text-foreground">待审批的出库申请</h2>
            <p className="mt-2 text-small text-text-secondary">
              申请人：{pending.requesterName ?? pending.requesterId} · 申请时间：
              {formatDateTime(pending.createdAt)}
            </p>
            <p className="mt-1 text-small text-text-secondary">用途：{pending.purpose}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* 操作历史 */}
      <Card className="mt-4">
        <CardContent className="py-5">
          <h2 className="text-body font-semibold text-foreground">操作记录</h2>
          {!logs.ok ? (
            <p className="mt-2 text-small text-text-secondary">无法加载操作记录：{logs.error}</p>
          ) : logs.data.length === 0 ? (
            <p className="mt-2 text-small text-text-secondary">暂无操作记录。</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {logs.data.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-2 text-small last:border-0"
                >
                  <span className="font-medium text-foreground">
                    {SAMPLE_ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="text-text-muted">{log.actorEmail ?? '系统'}</span>
                  <span className="text-text-muted">{formatDateTime(log.createdAt)}</span>
                  {log.summary ? (
                    <span className="text-text-secondary">{log.summary}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-small text-foreground">{value || '—'}</dd>
    </div>
  );
}
