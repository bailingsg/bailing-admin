import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getQualityRecord } from '@/lib/enterprise';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getContentPreview, type ContentPreview } from '@/lib/publishing';
import { QualityRecordForm } from '../../quality-form';
import { PublishControls } from '../../../publish-controls';
import { DeleteQualityButton } from '../../delete-quality-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑质量记录',
  description: '编辑认证 / 报告 / 标准记录，并独立发布或取消发布。',
};

/** 编辑质量记录（Phase 4.5 / Phase 1 发布面板） */
export default async function EditQualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();

  const [result, previewResult, admin] = await Promise.all([
    getQualityRecord(token, id),
    getContentPreview<{ slug: string }>(token, 'quality', id),
    getCurrentAdmin(token) as Promise<
      { ok: true; data: AdminProfile } | { ok: false; error: string; status: number }
    >,
  ]);

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
  const preview = previewResult.ok
    ? (previewResult.data as ContentPreview<{ slug: string }>)
    : null;
  const canPublish = hasPermission(admin.ok ? admin.data : null, 'quality.publish');
  const canUnpublish = hasPermission(admin.ok ? admin.data : null, 'quality.unpublish');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="编辑质量记录"
        description="保存只写编辑稿，上线需点「发布」。"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/quality">返回列表</Link>
            </Button>
            <DeleteQualityButton id={record.id} title={record.title} redirectTo="/quality" />
          </div>
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <QualityRecordForm record={record} />

        <div className="flex flex-col gap-6">
          <PublishControls
            kind="quality"
            id={record.id}
            status={preview?.status ?? record.status}
            publishedVersion={preview?.publishedVersion ?? 0}
            hasUnpublishedChanges={preview?.hasUnpublishedChanges ?? false}
            revalidatePaths={['/quality', `/quality/${record.id}/edit`]}
            canPublish={canPublish}
            canUnpublish={canUnpublish}
            publicHref="/quality"
            previewHref={`/preview/quality/${record.id}`}
          />
        </div>
      </div>
    </Container>
  );
}
