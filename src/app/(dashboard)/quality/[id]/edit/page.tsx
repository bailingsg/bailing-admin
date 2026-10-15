import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getQualityRecord } from '@/lib/enterprise';
import { QualityRecordForm } from '../../quality-form';
import { DeleteQualityButton } from '../../delete-quality-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑质量记录',
  description: '编辑认证 / 报告 / 标准记录。',
};

/** 编辑质量记录（Phase 4.5） */
export default async function EditQualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  const result = await getQualityRecord(token, id);

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <Container width="page" className="py-8">
        <PageHeader title="编辑质量记录" />
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-small text-destructive">
          无法加载记录：{result.error}
        </div>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/quality">返回列表</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const record = result.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="编辑质量记录"
        description={record.title}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/quality">返回列表</Link>
            </Button>
            <DeleteQualityButton id={record.id} title={record.title} redirectTo="/quality" />
          </div>
        }
      />
      <div className="mt-6">
        <QualityRecordForm record={record} />
      </div>
    </Container>
  );
}
