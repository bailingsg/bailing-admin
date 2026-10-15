import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { FactorySectionForm } from '../factory-form';

export const metadata = {
  title: '新建工厂分区',
  description: '创建工厂实力分区内容。',
};

/** 新建工厂分区（Phase 4.5） */
export default function CreateFactoryPage() {
  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新建工厂分区"
        description="填写内容、上传 / 选择媒体并配置发布与 SEO 信息。"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/factory">返回列表</Link>
          </Button>
        }
      />
      <div className="mt-6">
        <FactorySectionForm />
      </div>
    </Container>
  );
}
