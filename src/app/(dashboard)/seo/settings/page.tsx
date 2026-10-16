import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { getSeoSettings } from '@/lib/seo';
import { SeoNav } from '../seo-nav';
import { SeoSettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · Global Settings',
  description: 'SEO 全局设置：站点信息、标题模板、公司资料、社交链接与站长工具。',
};

/** SEO → Global Settings（任务书十九~二十节、三十七节） */
export default async function SeoSettingsPage() {
  const token = await getSessionToken();
  const result = await getSeoSettings(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="SEO 全局设置"
        description="站点信息、标题模板、公司资料（Organization Schema 数据源）、社交链接与站长工具配置。未确认信息请留空，严禁虚构。"
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      <div className="mt-6">
        {!result.ok ? (
          <Card>
            <CardContent className="flex flex-col gap-3 py-8">
              <p className="text-body font-medium text-foreground">无法加载全局设置</p>
              <p className="text-small text-text-secondary">{result.error}</p>
              <p className="text-caption text-text-muted">
                请确认后端服务已启动（默认 4000 端口）且数据库可用。
              </p>
            </CardContent>
          </Card>
        ) : (
          <SeoSettingsForm settings={result.data} />
        )}
      </div>
    </Container>
  );
}
