import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getRfqDetail } from '@/lib/rfq';
import { getSessionToken } from '@/lib/session';
import { RfqNotifyBadge } from '../notify-badge';
import { RfqStatusBadge } from '../status-badge';
import { ResendNotifyButton } from './resend-button';
import { StatusUpdater } from './status-updater';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'RFQ 详情',
  description: '查看询盘详情并更新跟进状态。',
};

/** 详情字段行 */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-caption font-medium text-text-muted">{label}</dt>
      <dd className="min-w-0 text-small break-words text-foreground">{value || '—'}</dd>
    </div>
  );
}

/**
 * RFQ 详情。
 * 展示客户信息 / 需求内容 / 关联产品 / 附件，并支持状态流转。
 */
export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  const result = await getRfqDetail(token, id);

  if (!result.ok) {
    return (
      <Container width="page" className="py-8">
        <PageHeader
          title="RFQ 详情"
          breadcrumb={
            <Link href="/rfq" className="text-primary hover:underline">
              ← 返回询盘列表
            </Link>
          }
        />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载该询盘</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <div>
              <Button asChild variant="outline" size="sm">
                <Link href="/rfq">返回列表</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const rfq = result.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={rfq.name}
        description={`${rfq.company} · ${rfq.country}`}
        breadcrumb={
          <Link href="/rfq" className="text-primary hover:underline">
            ← 返回询盘列表
          </Link>
        }
        actions={<RfqStatusBadge status={rfq.status} />}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 客户信息 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>客户信息</CardTitle>
            <CardDescription>采购商联系方式</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Field label="Name" value={rfq.name} />
              <Field label="Company" value={rfq.company} />
              <Field
                label="Email"
                value={
                  <a href={`mailto:${rfq.email}`} className="text-primary hover:underline">
                    {rfq.email}
                  </a>
                }
              />
              <Field label="Phone" value={rfq.phone} />
              <Field label="Country / Region" value={rfq.country} />
            </dl>
          </CardContent>
        </Card>

        {/* 状态管理 */}
        <Card>
          <CardHeader>
            <CardTitle>跟进状态</CardTitle>
            <CardDescription>NEW → CONTACTED → QUOTED → CLOSED</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <StatusUpdater id={rfq.id} current={rfq.status} />
            <dl className="flex flex-col gap-1 border-t border-border pt-4 text-caption text-text-muted">
              <div className="flex justify-between gap-2">
                <dt>提交时间</dt>
                <dd>{formatDateTime(rfq.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>更新时间</dt>
                <dd>{formatDateTime(rfq.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>询盘编号</dt>
                <dd className="break-all">{rfq.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 通知投递 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>通知投递</CardTitle>
          <CardDescription>询盘通知邮件是否已发送给承接人</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <RfqNotifyBadge status={rfq.notifyStatus} />
            <span className="text-caption text-text-muted">
              已尝试 {rfq.notifyAttempts} 次
              {rfq.notifiedAt ? ` · 最近成功：${formatDateTime(rfq.notifiedAt)}` : ''}
            </span>
          </div>
          {rfq.notifyStatus === 'FAILED' && rfq.notifyError ? (
            <p className="text-caption break-words text-destructive">
              最近失败原因：{rfq.notifyError}
            </p>
          ) : null}
          <div>
            <ResendNotifyButton id={rfq.id} />
          </div>
        </CardContent>
      </Card>

      {/* 需求内容 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>需求内容</CardTitle>
          <CardDescription>客户提交的采购需求</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-small whitespace-pre-line text-text-secondary">{rfq.message}</p>
          <dl className="grid grid-cols-1 gap-x-8 border-t border-border pt-4 sm:grid-cols-2">
            <Field label="Quantity" value={rfq.quantity} />
            <Field
              label="Product"
              value={
                rfq.productName ? (
                  <span>
                    {rfq.productName}
                    {rfq.productId ? (
                      <span className="ml-2 text-caption text-text-muted">({rfq.productId})</span>
                    ) : null}
                  </span>
                ) : null
              }
            />
            <Field
              label="Attachment"
              value={
                rfq.attachmentUrl ? (
                  <a
                    href={rfq.attachmentUrl}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {rfq.attachmentUrl}
                  </a>
                ) : (
                  '未提供附件'
                )
              }
            />
          </dl>
        </CardContent>
      </Card>
    </Container>
  );
}
