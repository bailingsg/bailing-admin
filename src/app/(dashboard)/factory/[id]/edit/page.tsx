import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getFactorySection } from '@/lib/enterprise';
import { FactorySectionForm } from '../../factory-form';
import { DeleteFactoryButton } from '../../delete-factory-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑工厂分区',
  description: '编辑工厂实力分区内容。',
};

/** 编辑工厂分区（Phase 4.5） */
export default async function EditFactoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  const result = await getFactorySection(token, id);

  if (!result.ok) {
    // 记录不存在 → 真 404
    if (result.status === 404) notFound();
    return (
      <Container width="page" className="py-8">
        <PageHeader title="编辑工厂分区" />
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-small text-destructive">
          无法加载分区：{result.error}
        </div>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/factory">返回列表</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const section = result.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="编辑工厂分区"
        description={section.title}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/factory">返回列表</Link>
            </Button>
            <DeleteFactoryButton id={section.id} title={section.title} redirectTo="/factory" />
          </div>
        }
      />
      <div className="mt-6">
        <FactorySectionForm section={section} />
      </div>
    </Container>
  );
}
