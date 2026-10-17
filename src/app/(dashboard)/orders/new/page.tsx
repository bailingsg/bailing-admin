import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { OrderForm } from '../order-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '新增订单',
  description: '录入新订单：业务员自动关联当前登录账号，订单编号由系统生成。',
};

export default function NewOrderPage() {
  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新增订单"
        description="业务员自动关联当前登录账号；订单编号由系统生成；照片上传后保存订单时自动关联。"
      />
      <div className="mt-6">
        <OrderForm mode="create" />
      </div>
    </Container>
  );
}
