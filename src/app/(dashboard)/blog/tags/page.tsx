import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listBlogTags } from '@/lib/blog';
import { BlogNav } from '../blog-nav';
import { BlogTagManager } from './tag-manager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '博客标签管理',
  description: '管理博客标签：创建、编辑与删除（删除仅解除文章关联）。',
};

/** 博客标签管理（Phase 4.4） */
export default async function BlogTagsPage() {
  const token = await getSessionToken();
  const tagsResult = await listBlogTags(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="博客标签管理"
        description="标签用于交叉关联文章；删除标签只会解除文章关联，不会删除文章。"
      />

      <div className="mt-4">
        <BlogNav />
      </div>

      <div className="mt-6">
        {!tagsResult.ok ? (
          <Card>
            <CardContent className="flex flex-col gap-3 py-8">
              <p className="text-body font-medium text-foreground">无法加载标签列表</p>
              <p className="text-small text-text-secondary">{tagsResult.error}</p>
              <Link href="/blog" className="text-small text-primary hover:underline">
                返回文章列表
              </Link>
            </CardContent>
          </Card>
        ) : (
          <BlogTagManager tags={tagsResult.data} />
        )}
      </div>
    </Container>
  );
}
