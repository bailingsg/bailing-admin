import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  getSampleProfile,
  isAdminProfile,
  listArchiveSamples,
  type SampleItem,
} from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '出库归档',
  description: '同意出库后归档的样品历史（仅管理员可见）。',
};

const PAGE_SIZE = 20;

/**
 * 出库归档历史（Phase 5.1）。
 * 仅持有 samples.manage / 超级管理员可访问；业务员访问直接重定向回样品列表。
 */
export default async function SamplesArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;

  const token = await getSessionToken();
  const me = await getSampleProfile(token);
  if (!me.ok || !isAdminProfile(me.data)) {
    redirect('/samples');
  }

  const result = await listArchiveSamples(token, { page, limit: PAGE_SIZE, keyword });

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="出库归档"
        description="已同意出库的样品从正常列表移除，仅此处保留历史，关联申请与操作记录一并保留。"
        breadcrumb={
          <Link href="/samples" className="text-small text-primary hover:underline">
            返回样品列表
          </Link>
        }
      />

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="py-8">
            <p className="text-body font-medium text-foreground">无法加载归档历史</p>
            <p className="mt-1 text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无归档样品</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 条
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {result.data.items.map((item: SampleItem) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-1 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span className="font-medium text-foreground">
                        {item.code} · {item.name}
                      </span>
                      <span className="text-small text-text-muted">
                        出库时间：{item.archivedAt ? formatDateTime(item.archivedAt) : '—'}
                      </span>
                    </div>
                    <p className="text-small text-text-secondary">
                      持有人：{item.ownerName ?? '—'} · 数量：{item.quantity} {item.unit} · 位置：
                      {item.location}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
