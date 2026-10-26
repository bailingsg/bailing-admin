import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { frontendUrl } from '@/lib/frontend-url';
import { getFactorySection } from '@/lib/enterprise';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getContentPreview, type ContentPreview } from '@/lib/publishing';
import { mergeFactorySectionDraft } from '@/lib/draft-merge';
import { FactorySectionForm } from '../../factory-form';
import { PublishControls } from '../../../publish-controls';
import { DeleteFactoryButton } from '../../delete-factory-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑工厂分区',
  description: '编辑工厂实力分区内容，并独立发布或取消发布。',
};

/** 编辑工厂分区（Phase 4.5 / Phase 1 发布面板） */
export default async function EditFactoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();

  const [result, previewResult, admin] = await Promise.all([
    getFactorySection(token, id),
    getContentPreview<{ slug: string }>(token, 'factory', id),
    getCurrentAdmin(token) as Promise<
      { ok: true; data: AdminProfile } | { ok: false; error: string; status: number }
    >,
  ]);

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

  const preview = previewResult.ok
    ? (previewResult.data as ContentPreview<{ slug: string }>)
    : null;
  // 已发布分区的「保存」只写编辑稿 → 表单用「线上版本 + 最新编辑稿」初始化，
  // 否则重新打开看不到未发布修改，一次普通保存就把草稿覆盖回线上旧值。
  const section = await mergeFactorySectionDraft(result.data, preview?.draft ?? null, token);
  const canPublish = hasPermission(admin.ok ? admin.data : null, 'factory.publish');
  const canUnpublish = hasPermission(admin.ok ? admin.data : null, 'factory.unpublish');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="编辑工厂分区"
        description="保存只写编辑稿，上线需点「发布」。"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/factory">返回列表</Link>
            </Button>
            <DeleteFactoryButton id={section.id} title={section.title} redirectTo="/factory" />
          </div>
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <FactorySectionForm section={section} />

        <div className="flex flex-col gap-6">
          <PublishControls
            kind="factory"
            id={section.id}
            status={preview?.status ?? section.status}
            publishedVersion={preview?.publishedVersion ?? 0}
            hasUnpublishedChanges={preview?.hasUnpublishedChanges ?? false}
            revalidatePaths={['/factory', `/factory/${section.id}/edit`]}
            canPublish={canPublish}
            canUnpublish={canUnpublish}
            publicHref={frontendUrl('/factory')}
            previewHref={`/preview/factory/${section.id}`}
          />
        </div>
      </div>
    </Container>
  );
}
