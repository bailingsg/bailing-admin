import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listSeoEntities } from '@/lib/seo';
import { SeoNav } from '../seo-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · Schema',
  description: 'Schema.org 结构化数据配置总览。',
};

/** Schema 类型 → 适用页面说明 */
const SCHEMA_GUIDE: {
  type: string;
  label: string;
  description: string;
  where: string;
}[] = [
  {
    type: 'ORGANIZATION',
    label: 'Organization',
    description: '全站输出（根布局）。公司信息来自 Global Settings，未配置字段不输出，严禁虚构。',
    where: '全站',
  },
  {
    type: 'WEBSITE',
    label: 'WebSite',
    description: '首页输出。与 Organization 通过稳定 @id 关联。',
    where: '首页 /',
  },
  {
    type: 'PRODUCT',
    label: 'Product',
    description: '产品详情页输出（名称 / 描述 / 图片 / 品牌）。',
    where: '/products/[slug]',
  },
  {
    type: 'ARTICLE',
    label: 'Article',
    description: '博客文章详情页输出（标题 / 作者 / 发布时间 / 封面）。',
    where: '/blog/[slug]',
  },
  {
    type: 'BREADCRUMBLIST',
    label: 'BreadcrumbList',
    description: '详情页输出，与页面可见面包屑逐字一致（Home → Category → Product）。',
    where: '全部详情页',
  },
  {
    type: 'FAQPAGE',
    label: 'FAQPage',
    description: '含 FAQ 的页面输出（当前：联系页）。问答必须与页面可见内容一致。',
    where: '/contact',
  },
];

/**
 * SEO → Schema（任务书二十四~二十五节）
 *
 * 结构化数据由统一 Schema 系统生成：页面级 Schema 类型在各实体的 SEO 编辑页
 * 选择；FAQ 数据经前后端双重白名单校验（仅 [{question,answer}]，禁 HTML）。
 */
export default async function SeoSchemaPage() {
  const token = await getSessionToken();
  const [pages, products, blog] = await Promise.all([
    listSeoEntities(token, 'pages', { limit: 100 }),
    listSeoEntities(token, 'products', { limit: 100 }),
    listSeoEntities(token, 'blog', { limit: 100 }),
  ]);

  const rows = [
    ...(pages.ok ? pages.data.items : []),
    ...(products.ok ? products.data.items : []),
    ...(blog.ok ? blog.data.items : []),
  ];
  const configured = rows.filter((row) => row.schemaType !== 'NONE');
  const missing = rows.filter((row) => row.schemaType === 'NONE');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="结构化数据（Schema.org）"
        description="统一 Schema 系统：类型在各实体 SEO 编辑页选择；后台填写的 FAQ 数据经前后端双重白名单校验，禁止任意 JSON 与 HTML 注入。"
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      {/* 类型说明 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCHEMA_GUIDE.map((item) => (
          <Card key={item.type}>
            <CardContent className="flex flex-col gap-1 py-4">
              <p className="text-small font-medium text-foreground">{item.label}</p>
              <p className="text-caption text-text-muted">{item.where}</p>
              <p className="text-small text-text-secondary">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 配置状态 */}
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 py-5">
          <h2 className="text-small font-medium text-foreground">配置情况</h2>
          <p className="text-small text-text-secondary">
            已选择 Schema 类型 <span className="font-medium text-foreground">{configured.length}</span> 项 · 未选择{' '}
            <span className="font-medium text-foreground">{missing.length}</span> 项（留空 = 不输出附加 Schema；
            页面仍可能输出框架级 Organization / WebSite / BreadcrumbList）。
          </p>
          {configured.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {configured.slice(0, 20).map((row) => (
                <li key={`${row.entityType}:${row.entityId}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-small text-foreground">{row.name}</span>
                  <code className="text-caption text-text-muted">{row.url}</code>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-caption text-text-secondary">
                    {row.schemaType}
                  </span>
                  <Link
                    href={`/seo/${row.entityType}/${encodeURIComponent(row.entityId)}`}
                    className="text-caption text-primary hover:underline"
                  >
                    编辑
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-text-secondary">
              还没有实体选择 Schema 类型。建议：产品页选 Product、博客文章选 ARTICLE、含 FAQ 的页面选 FAQ_PAGE。
            </p>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
