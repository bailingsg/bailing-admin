import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getApplication } from '@/lib/enterprise';
import { ApplicationForm } from '../../application-form';
import { DeleteApplicationButton } from '../../delete-application-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑应用场景',
  description: '编辑产品应用场景及其关联产品。',
};

/** 编辑应用场景（Phase 4.5） */
export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  const result = await getApplication(token, id);

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

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="编辑应用场景"
        description={application.name}
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
      <div className="mt-6">
        <ApplicationForm application={application} />
      </div>
    </Container>
  );
}
