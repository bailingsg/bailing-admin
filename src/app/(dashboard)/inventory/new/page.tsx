import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { getOrder, type OrderItem } from '@/lib/orders';
import { InventoryForm } from '../inventory-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '为订单新增库存',
  description: '从订单详情创建库存，自动关联当前订单。',
};

/**
 * 订单关联库存新建页（Phase 5.3 核心入口）。
 *
 * 从订单详情页「新增库存」进入：?orderId=xxx。
 * 关联订单从后端读取并锁定展示；表单不提供订单选择，
 * 防止通过修改前端参数把库存关联到其他订单（后端同样会校验）。
 */
export default async function NewInventoryForOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId?.trim();
  if (!orderId) redirect('/inventory');

  const token = await getSessionToken();
  const result = await getOrder(token, orderId);
  // 订单不存在或无权查看 → 回库存列表（不泄漏订单存在性）
  if (!result.ok || result.data.id !== orderId) redirect('/inventory');
  const order: OrderItem = result.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="为订单新增库存"
        description={`保存后自动关联订单 ${order.code}，无需手动输入订单号。`}
        actions={
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex h-9 items-center rounded-md border border-border-strong bg-background px-3.5 text-small font-medium text-foreground transition-colors hover:bg-accent"
          >
            返回订单详情
          </Link>
        }
      />

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4 py-5">
          <div className="rounded-md border border-border bg-surface px-3 py-2">
            <p className="text-caption text-text-muted">当前关联订单（由后端校验，不可更改）</p>
            <p className="text-small font-medium text-foreground">
              {order.code} · {order.customerName}（{order.country}）
            </p>
          </div>

          <InventoryForm
            mode="create"
            linkedOrder={{ id: order.id, code: order.code }}
            open
            showTrigger={false}
            closeHref={`/orders/${order.id}`}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
