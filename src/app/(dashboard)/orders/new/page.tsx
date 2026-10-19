import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { OrderForm } from '../order-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '新增订单',
  description: '录入新订单：业务员自动关联当前登录账号，订单编号手动填写且全系统唯一。',
};

export default function NewOrderPage() {
  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新增订单"
        description="业务员自动关联当前登录账号；订单编号手动填写且全系统唯一；可选同步录入关联库存。"
      />
      <div className="mt-6">
        <OrderForm mode="create" />
      </div>
    </Container>
  );
}
