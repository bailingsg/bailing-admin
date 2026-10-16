import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { getSeoRobots, getSeoSettings } from '@/lib/seo';
import { SeoNav } from '../seo-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · Robots',
  description: 'Robots.txt 预览（Sitemap 域名来自全局设置）。',
};

/** SEO → Robots（任务书二十三节：域名必须来自 Global SEO Settings，不硬编码） */
export default async function SeoRobotsPage() {
  const token = await getSessionToken();
  const [robotsResult, settingsResult] = await Promise.all([
    getSeoRobots(token),
    getSeoSettings(token),
  ]);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="Robots.txt"
        description="屏蔽后台 / 接口 / 搜索路径；Sitemap 地址取自 Global Settings 的 Canonical Domain（未配置时回退站点环境变量，绝不硬编码开发环境域名）。"
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-small font-medium text-foreground">线上 robots.txt 预览</h2>
            {settingsResult.ok ? (
              <span className="text-caption text-text-muted">
                当前规范域名：
                <code className="ml-1">{settingsResult.data.canonicalDomain ?? '（未配置，回退站点 URL）'}</code>
              </span>
            ) : null}
          </div>
          {robotsResult.ok ? (
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-4 text-caption text-foreground">
              {robotsResult.data.robots}
            </pre>
          ) : (
            <p className="text-small text-red-700">{robotsResult.error}</p>
          )}
          <p className="text-caption text-text-muted">
            说明：本站收录总开关由前台环境变量控制（生产默认允许收录）；整站临时封闭时输出
            <code> Disallow: /</code>，sitemap 同步返回空列表，两者保持一致。
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
