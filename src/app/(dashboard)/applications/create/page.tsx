import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ApplicationForm } from '../application-form';

export const metadata = {
  title: '新建应用场景',
  description: '创建产品应用场景并关联产品。',
};

/** 新建应用场景（Phase 4.5） */
export default function CreateApplicationPage() {
  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新建应用场景"
        description="填写场景信息、选择封面，并按需关联产品（显式多对多）。"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/applications">返回列表</Link>
          </Button>
        }
      />
      <div className="mt-6">
        <ApplicationForm />
      </div>
    </Container>
  );
}
