import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getSeoProfile, getSeoSettings, SEO_ENTITY_TYPE_LABELS, type SeoEntityType } from '@/lib/seo';
import { SeoNav } from '../../seo-nav';
import { SeoEditor } from './seo-editor';

export const dynamic = 'force-dynamic';

const ENTITY_TYPES: SeoEntityType[] = [
  'PAGE',
  'PRODUCT',
  'PRODUCT_CATEGORY',
  'BLOG_POST',
  'BLOG_CATEGORY',
  'APPLICATION',
  'FACTORY_SECTION',
  'QUALITY_RECORD',
];

/**
 * SEO 档案编辑页（任务书四十节：Basic SEO / Social Preview / Canonical /
 * Robots / Schema / SEO Score / Audit Results）。
 */
export default async function SeoProfileEditPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!(ENTITY_TYPES as string[]).includes(type)) {
    notFound();
  }

  const token = await getSessionToken();
  const [profileResult, settingsResult] = await Promise.all([
    getSeoProfile(token, type, decodeURIComponent(id)),
    getSeoSettings(token),
  ]);

  const typeLabel = SEO_ENTITY_TYPE_LABELS[type as SeoEntityType] ?? type;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`SEO 编辑 · ${typeLabel}`}
        description="所有公开页面通过统一 SEO Resolver 消费此处配置；留空字段按「内容值 → 全局设置 → 系统默认」逐级兜底。"
        actions={
          <Button asChild variant="outline">
            <Link href="/seo">返回 SEO 总览</Link>
          </Button>
        }
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      <div className="mt-6">
        {!profileResult.ok || !settingsResult.ok ? (
          <Card>
            <CardContent className="flex flex-col gap-3 py-8">
              <p className="text-body font-medium text-foreground">无法加载 SEO 档案</p>
              <p className="text-small text-text-secondary">
                {!profileResult.ok
                  ? profileResult.error
                  : !settingsResult.ok
                    ? settingsResult.error
                    : '未知错误'}
              </p>
              <p className="text-caption text-text-muted">
                实体不存在或后端服务不可用。静态页面 key：home / products / applications / factory /
                quality / about / contact / blog。
              </p>
            </CardContent>
          </Card>
        ) : (
          <SeoEditor
            profile={profileResult.data}
            settings={settingsResult.data}
            entityType={type}
            entityId={decodeURIComponent(id)}
          />
        )}
      </div>
    </Container>
  );
}
