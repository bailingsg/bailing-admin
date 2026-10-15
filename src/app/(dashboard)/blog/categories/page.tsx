import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listBlogCategories } from '@/lib/blog';
import { BlogNav } from '../blog-nav';
import { BlogCategoryManager } from './category-manager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '博客分类管理',
  description: '管理博客分类：排序、启用/停用与删除保护。',
};

/** 博客分类管理（Phase 4.4）：支持排序与启用/停用 */
export default async function BlogCategoriesPage() {
  const token = await getSessionToken();
  const categoriesResult = await listBlogCategories(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="博客分类管理"
        description="分类用于组织文章并生成分类归档页；支持排序与启用/停用。"
      />

      <div className="mt-4">
        <BlogNav />
      </div>

      <div className="mt-6">
        {!categoriesResult.ok ? (
          <Card>
            <CardContent className="flex flex-col gap-3 py-8">
              <p className="text-body font-medium text-foreground">无法加载分类列表</p>
              <p className="text-small text-text-secondary">{categoriesResult.error}</p>
              <Link href="/blog" className="text-small text-primary hover:underline">
                返回文章列表
              </Link>
            </CardContent>
          </Card>
        ) : (
          <BlogCategoryManager categories={categoriesResult.data} />
        )}
      </div>
    </Container>
  );
}
