import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getCurrentAdmin } from '@/lib/api';
import {
  formatOrderAmount,
  getOrder,
  orderPhotoUrl,
  type OrderItem,
} from '@/lib/orders';
import { OrderForm } from '../order-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '订单详情',
  description: '订单信息、客户需求、成交状态与订单照片。',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getSessionToken();
  const [me, result] = await Promise.all([getCurrentAdmin(token), getOrder(token, id)]);

  // 不存在、或无权限查看（业务员越权）一律 404，不泄漏订单存在性
  if (!result.ok || result.data.id !== id) notFound();
  const order: OrderItem = result.data;
  const isAdmin = me.ok && me.data.isSuperAdmin;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={order.code}
        description={`客户：${order.customerName}（${order.country}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/orders"
              className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small font-medium text-foreground transition-colors hover:bg-accent"
            >
              返回列表
            </Link>
            <OrderForm mode="edit" order={order} />
          </div>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-title font-semibold text-foreground">
                  {formatOrderAmount(order.amount, order.currency)}
                </span>
                {order.closedAt ? (
                  <Badge variant="success">已成交</Badge>
                ) : (
                  <Badge variant="muted">未成交</Badge>
                )}
              </div>

              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-text-muted">客户名称</dt>
                  <dd className="text-small text-foreground">{order.customerName}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">国家/地区</dt>
                  <dd className="text-small text-foreground">{order.country}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">下单时间</dt>
                  <dd className="text-small text-foreground">{formatDateTime(order.orderedAt)}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">成交时间</dt>
                  <dd className="text-small text-foreground">
                    {order.closedAt ? formatDateTime(order.closedAt) : '—'}
                  </dd>
                </div>
                {isAdmin ? (
                  <div>
                    <dt className="text-caption text-text-muted">业务员</dt>
                    <dd className="text-small text-foreground">
                      {order.salespersonName ?? order.salespersonId}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-caption text-text-muted">创建时间</dt>
                  <dd className="text-small text-foreground">{formatDateTime(order.createdAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption text-text-muted">客户需求</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-small text-foreground">
                    {order.requirement}
                  </dd>
                </div>
                {order.note ? (
                  <div className="sm:col-span-2">
                    <dt className="text-caption text-text-muted">备注</dt>
                    <dd className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-small text-foreground">
                      {order.note}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <h2 className="text-body font-semibold text-foreground">
                订单照片（{order.attachments.length}）
              </h2>
              <p className="mt-1 text-caption text-text-muted">
                照片为业务附件，经鉴权接口输出；不会出现在媒体库中。
              </p>
              {order.attachments.length === 0 ? (
                <p className="mt-4 text-small text-text-secondary">暂无照片</p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {order.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a
                        href={orderPhotoUrl(order.id, attachment.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-md border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={orderPhotoUrl(order.id, attachment.id)}
                          alt={attachment.originalName}
                          className="h-32 w-full object-cover transition-transform group-hover:scale-[1.02]"
                        />
                      </a>
                      <p className="mt-1 truncate text-caption text-text-muted" title={attachment.originalName}>
                        {attachment.originalName}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <h2 className="text-body font-semibold text-foreground">操作提示</h2>
              <p className="text-small text-text-secondary">
                点击右上角「编辑订单」可全量更新字段与照片（保存后立即生效）。
              </p>
              <p className="text-small text-text-secondary">
                如需修改数量、币种或客户需求，请在编辑弹窗中调整后保存。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
