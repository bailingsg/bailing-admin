import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { getSessionToken } from '@/lib/session';
import { getSeoAudit } from '@/lib/seo';
import { SeoNav } from '../seo-nav';
import { AuditResultView, RunAuditButton } from './audit-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · SEO Audit',
  description: '全站 SEO 健康审计（只读）。',
};

/**
 * SEO → SEO Audit（任务书三十~三十三节）
 *
 * 检查项：Technical（canonical / sitemap 矛盾 / 断链）/ Metadata（标题 /
 * 描述 / OG）/ Content（H1 / 内容深度 / Alt / 内链）/ URL（大小写 / 斜杠 /
 * 重复）。审计只读，不自动修改任何内容。
 */
export default async function SeoAuditPage() {
  const token = await getSessionToken();
  const result = await getSeoAudit(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="SEO 审计"
        description="全站只读健康检查：缺失 canonical、sitemap 收录矛盾、断链、缺失 Alt、标题 / 描述长度、H1、内容深度等。审计不会自动修改任何内容。"
        actions={<RunAuditButton />}
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      <div className="mt-6">
        {!result.ok ? (
          <p className="text-small text-red-700">无法加载审计结果：{result.error}</p>
        ) : (
          <AuditResultView result={result.data} />
        )}
      </div>
    </Container>
  );
}
