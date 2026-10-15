import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { QualityRecordForm } from '../quality-form';

export const metadata = {
  title: '新建质量记录',
  description: '创建认证、检测报告、质量控制或执行标准记录。',
};

/** 新建质量记录（Phase 4.5） */
export default function CreateQualityPage() {
  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新建质量记录"
        description="录入认证 / 报告信息并关联证书文件；机构、编号与日期可留空。"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/quality">返回列表</Link>
          </Button>
        }
      />
      <div className="mt-6">
        <QualityRecordForm />
      </div>
    </Container>
  );
}
