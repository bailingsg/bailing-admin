import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listBlogCategories, listBlogTags } from '@/lib/blog';
import { BlogNav } from '../blog-nav';
import { BlogPostForm } from '../post-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '新建文章',
  description: '撰写新的博客文章，配置分类、标签、封面与 SEO。',
};

/** 新建文章页：分类/标签为下拉与多选数据源 */
export default async function CreateBlogPostPage() {
  const token = await getSessionToken();
  const [categoriesResult, tagsResult] = await Promise.all([
    listBlogCategories(token),
    listBlogTags(token),
  ]);

  if (!categoriesResult.ok) {
    return (
      <Container width="page" className="py-8">
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载分类数据</p>
            <p className="text-small text-text-secondary">{categoriesResult.error}</p>
            <Link href="/blog" className="text-small text-primary hover:underline">
              返回文章列表
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!tagsResult.ok) {
    return (
      <Container width="page" className="py-8">
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载标签数据</p>
            <p className="text-small text-text-secondary">{tagsResult.error}</p>
            <Link href="/blog" className="text-small text-primary hover:underline">
              返回文章列表
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新建文章"
        description="保存后可继续编辑 SEO、更换封面或发布上线。"
        breadcrumb={
          <Link href="/blog" className="hover:text-foreground">
            博客管理
          </Link>
        }
      />

      <div className="mt-4">
        <BlogNav />
      </div>

      <div className="mt-6">
        <BlogPostForm categories={categoriesResult.data} tags={tagsResult.data} />
      </div>
    </Container>
  );
}
