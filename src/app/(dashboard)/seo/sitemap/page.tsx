import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { getSeoSitemap } from '@/lib/seo';
import { SeoNav } from '../seo-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · Sitemap',
  description: 'Sitemap 内容预览（由数据库实际内容自动生成）。',
};

/** SEO → Sitemap（任务书二十一~二十二节） */
export default async function SeoSitemapPage() {
  const token = await getSessionToken();
  const result = await getSeoSitemap(token);
  const entries = result.ok ? result.data : [];

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="Sitemap"
        description="由数据库实际内容自动生成：仅收录已发布内容，自动排除草稿 / 归档 / 显式 noindex / 后台与接口路径。内容发布或 SEO 变更后自动刷新，无需人工维护。"
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载 Sitemap 数据</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{entries.length}</span> 个 URL ·
            线上地址：<code className="text-caption">/sitemap.xml</code>
          </p>
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">更新频率</th>
                  <th className="px-4 py-3 font-medium">优先级</th>
                  <th className="px-4 py-3 font-medium">最后修改</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.path} className="text-small">
                    <td className="px-4 py-3">
                      <code className="text-caption text-foreground">{entry.path}</code>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{entry.changeFrequency}</td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">{entry.priority.toFixed(1)}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(entry.lastModified).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：列表 */}
          <div className="mt-3 flex flex-col gap-2 lg:hidden">
            {entries.map((entry) => (
              <Card key={entry.path}>
                <CardContent className="flex flex-col gap-1 py-3">
                  <code className="text-caption font-medium text-foreground">{entry.path}</code>
                  <span className="text-caption text-text-muted">
                    {entry.changeFrequency} · 优先级 {entry.priority.toFixed(1)} ·{' '}
                    {new Date(entry.lastModified).toLocaleDateString('zh-CN')}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}
