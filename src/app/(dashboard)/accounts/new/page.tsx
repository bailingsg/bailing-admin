import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AccountForm } from '../account-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '新建账号',
  description: '创建后台员工账号并分配角色。',
};

/** 新建账号（Phase 4.6） */
export default function NewAccountPage() {
  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新建账号"
        description="创建员工账号。初始口令可留空由系统生成，创建成功后仅显示一次。"
      />
      <Card className="mt-6">
        <CardContent className="py-6">
          <AccountForm mode="create" />
        </CardContent>
      </Card>
    </Container>
  );
}
