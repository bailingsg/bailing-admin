import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SampleFormModal } from '@/app/(dashboard)/samples/sample-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '新增样品',
  description: '录入新样品：名称、规格、材质、数量与存放位置。',
};

/** 新增样品页（表单弹窗承载实际交互） */
export default function NewSamplePage() {
  return (
    <Container width="narrow" className="py-8">
      <PageHeader
        title="新增样品"
        description="填写样品必要信息。样品编号由系统自动生成，持有人自动关联当前登录账号。"
        breadcrumb={
          <Link href="/samples" className="text-small text-primary hover:underline">
            返回样品列表
          </Link>
        }
      />
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <p className="text-body text-foreground">点击下方按钮打开样品录入表单</p>
          <SampleFormModal mode="create" triggerLabel="录入样品" />
        </CardContent>
      </Card>
    </Container>
  );
}
