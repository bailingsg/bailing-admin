import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getApplication } from '@/lib/enterprise';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getContentPreview, type ContentPreview } from '@/lib/publishing';
import { ApplicationForm } from '../../application-form';
import { PublishControls } from '../../../publish-controls';
import { DeleteApplicationButton } from '../../delete-application-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑应用场景',
  description: '编辑产品应用场景及其关联产品，并独立发布或取消发布。',
};

/** 编辑应用场景（Phase 4.5 / Phase 1 发布面板） */
export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();

  const [result, previewResult, admin] = await Promise.all([
    getApplication(token, id),
    getContentPreview<{ slug: string }>(token, 'applications', id),
    getCurrentAdmin(token) as Promise<
      { ok: true; data: AdminProfile } | { ok: false; error: string; status: number }
    >,
  ]);

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <Container width="page" className="py-8">
        <PageHeader title="编辑应用场景" />
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-small text-destructive">
          无法加载场景：{result.error}
        </div>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/applications">返回列表</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const application = result.data;
  const preview = previewResult.ok
    ? (previewResult.data as ContentPreview<{ slug: string }>)
    : null;
  const canPublish = hasPermission(admin.ok ? admin.data : null, 'applications.publish');
  const canUnpublish = hasPermission(admin.ok ? admin.data : null, 'applications.unpublish');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="编辑应用场景"
        description="保存只写编辑稿，上线需点「发布」。"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/applications">返回列表</Link>
            </Button>
            <DeleteApplicationButton
              id={application.id}
              name={application.name}
              redirectTo="/applications"
            />
          </div>
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ApplicationForm application={application} />

        <div className="flex flex-col gap-6">
          <PublishControls
            kind="applications"
            id={application.id}
            status={preview?.status ?? application.status}
            publishedVersion={preview?.publishedVersion ?? 0}
            hasUnpublishedChanges={preview?.hasUnpublishedChanges ?? false}
            revalidatePaths={['/applications', `/applications/${application.id}/edit`]}
            canPublish={canPublish}
            canUnpublish={canUnpublish}
            publicHref={`/applications/${application.slug}`}
            previewHref={`/preview/applications/${application.id}`}
          />
        </div>
      </div>
    </Container>
  );
}
