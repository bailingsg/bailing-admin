import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getCurrentAdmin } from '@/lib/api';
import { formatQuantity, getInventoryItem } from '@/lib/inventory';
import { InventoryForm } from '../inventory-form';
import { DeleteInventoryButton } from '../delete-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '库存详情',
  description: '库存记录详情、存放信息与关联订单。',
};

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getSessionToken();
  const [me, result] = await Promise.all([getCurrentAdmin(token), getInventoryItem(token, id)]);

  // 不存在、或无权限查看（越权 ID）一律 404，不泄漏记录存在性
  if (!result.ok || result.data.id !== id) notFound();
  const item = result.data;
  const isAdmin = me.ok && me.data.isSuperAdmin;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={item.code}
        description={item.productName}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/inventory"
              className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small font-medium text-foreground transition-colors hover:bg-accent"
            >
              返回列表
            </Link>
            <InventoryForm mode="edit" item={item} />
            <DeleteInventoryButton
              id={item.id}
              code={item.code}
              productName={item.productName}
              quantityText={formatQuantity(item.quantity, item.unit)}
              location={item.location}
            />
          </div>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-title font-semibold text-foreground">
                  {formatQuantity(item.quantity, item.unit)}
                </span>
                <Badge variant="muted">{item.location}</Badge>
              </div>

              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-text-muted">产品名称</dt>
                  <dd className="text-small text-foreground">{item.productName}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">存放位置</dt>
                  <dd className="text-small text-foreground">{item.location}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">存放日期</dt>
                  <dd className="text-small text-foreground">{formatDate(item.storedAt)}</dd>
                </div>
                <div>
                  <dt className="text-caption text-text-muted">关联订单</dt>
                  <dd className="text-small text-foreground">
                    {item.orderId && item.orderCode ? (
                      <Link href={`/orders/${item.orderId}`} className="text-primary hover:underline">
                        {item.orderCode}
                      </Link>
                    ) : (
                      '未关联订单'
                    )}
                  </dd>
                </div>
                {isAdmin ? (
                  <div>
                    <dt className="text-caption text-text-muted">创建人</dt>
                    <dd className="text-small text-foreground">{item.creatorName ?? '—'}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-caption text-text-muted">创建时间</dt>
                  <dd className="text-small text-foreground">{formatDateTime(item.createdAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption text-text-muted">产品详情</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-small text-foreground">
                    {item.productDetail}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <h2 className="text-body font-semibold text-foreground">操作提示</h2>
              <p className="text-small text-text-secondary">
                库存编号由系统生成，不可修改；编辑仅支持产品详情、数量、存放位置、存放日期等字段。
              </p>
              <p className="text-small text-text-secondary">
                删除库存不会影响关联订单及其照片；如需为订单补充库存，可在订单详情页点击「新增库存」。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
