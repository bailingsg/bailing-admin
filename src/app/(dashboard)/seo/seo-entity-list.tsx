import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { listSeoEntities, type SeoEntityListItem } from '@/lib/seo';
import { SeoNav } from './seo-nav';
import { RobotsBadge, SeoScoreBadge } from './seo-badges';

export const dynamic = 'force-dynamic';

interface SeoEntityListProps {
  /** 后端 scope：pages / products / blog */
  scope: 'pages' | 'products' | 'blog';
  title: string;
  description: string;
}

/**
 * SEO 实体列表（Phase 5.0，任务书十三~十五节）
 *
 * Pages / Products / Blog 三页共用本组件（数据与列完全一致）：
 * 搜索 / 状态筛选 / 仅看问题项 + 桌面表格 + 移动端卡片 + 进入 SEO 编辑页。
 */
export async function SeoEntityList({ scope, title, description }: SeoEntityListProps) {
  const token = await getSessionToken();
  const result = await listSeoEntities(token, scope, { limit: 100 });

  return (
    <Container width="page" className="py-8">
      <PageHeader title={title} description={description} />
      <div className="mt-6">
        <SeoNav />
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载 SEO 列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 个实体
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">SEO Title</th>
                  <th className="px-4 py-3 font-medium">Schema</th>
                  <th className="px-4 py-3 font-medium">Robots</th>
                  <th className="px-4 py-3 font-medium">分数</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.items.map((item) => (
                  <tr key={`${item.entityType}:${item.entityId}`} className="text-small">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="ml-2 text-caption text-text-muted">{item.businessStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <code className="text-caption">{item.url}</code>
                    </td>
                    <td className="max-w-56 px-4 py-3 text-text-secondary">
                      {item.metaTitle ? (
                        <span className="line-clamp-1" title={item.metaTitle}>
                          {item.metaTitle}
                        </span>
                      ) : (
                        <span className="text-red-600">未填写（模板兜底）</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{item.schemaType === 'NONE' ? '—' : item.schemaType}</td>
                    <td className="px-4 py-3">
                      <RobotsBadge index={item.robotsIndex} follow={item.robotsFollow} />
                    </td>
                    <td className="px-4 py-3">
                      <SeoScoreBadge score={item.seoScore} />
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/seo/${item.entityType}/${encodeURIComponent(item.entityId)}`}>编辑 SEO</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片 */}
          <div className="mt-3 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item) => (
              <SeoEntityCard key={`${item.entityType}:${item.entityId}`} item={item} />
            ))}
          </div>
        </>
      )}
    </Container>
  );
}

function SeoEntityCard({ item }: { item: SeoEntityListItem }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-small font-medium text-foreground">{item.name}</p>
            <code className="text-caption text-text-muted">{item.url}</code>
          </div>
          <SeoScoreBadge score={item.seoScore} />
        </div>
        <p className="text-small text-text-secondary">
          {item.metaTitle ? item.metaTitle : <span className="text-red-600">未填写 SEO Title</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <RobotsBadge index={item.robotsIndex} follow={item.robotsFollow} />
          <span className="text-caption text-text-muted">
            {item.schemaType === 'NONE' ? '无 Schema' : item.schemaType}
          </span>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href={`/seo/${item.entityType}/${encodeURIComponent(item.entityId)}`}>编辑 SEO</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
