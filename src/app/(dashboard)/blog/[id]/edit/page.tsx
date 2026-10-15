import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getBlogPost, listBlogCategories, listBlogTags, POST_STATUS_LABELS } from '@/lib/blog';
import { BlogNav } from '../../blog-nav';
import { BlogPostForm } from '../../post-form';
import { DeleteBlogPostButton } from '../../delete-post-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑文章',
  description: '修改文章内容、SEO、分类、标签、封面图与发布状态。',
};

/** 编辑文章页：复用创建表单 + 文章元信息 + 删除 */
export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();

  const [postResult, categoriesResult, tagsResult] = await Promise.all([
    getBlogPost(token, id),
    listBlogCategories(token),
    listBlogTags(token),
  ]);

  if (!postResult.ok) {
    return (
      <Container width="page" className="py-8">
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载文章数据</p>
            <p className="text-small text-text-secondary">{postResult.error}</p>
            <Link href="/blog" className="text-small text-primary hover:underline">
              返回文章列表
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

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

  const post = postResult.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`编辑：${post.title}`}
        description="修改内容、SEO、分类、标签与封面。删除操作不可恢复。"
        breadcrumb={
          <Link href="/blog" className="hover:text-foreground">
            博客管理
          </Link>
        }
      />

      <div className="mt-4">
        <BlogNav />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <BlogPostForm categories={categoriesResult.data} tags={tagsResult.data} post={post} />

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>文章信息</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-small">
              <InfoRow label="状态" value={POST_STATUS_LABELS[post.status]} />
              <InfoRow label="精选" value={post.featured ? '是' : '否'} />
              <InfoRow label="分类" value={post.category?.name ?? '未分类'} />
              <InfoRow
                label="标签"
                value={post.tags.length > 0 ? post.tags.map((t) => t.name).join('、') : '—'}
              />
              <InfoRow
                label="发布时间"
                value={post.publishedAt ? formatDateTime(post.publishedAt) : '未发布'}
              />
              <InfoRow label="作者" value={post.author?.name ?? '—'} />
              <InfoRow label="创建时间" value={formatDateTime(post.createdAt)} />
              <InfoRow label="更新时间" value={formatDateTime(post.updatedAt)} />
              <div className="border-t border-border pt-3">
                <span className="text-caption text-text-muted">文章地址（slug）</span>
                <p className="break-all font-mono text-caption text-text-secondary">/blog/{post.slug}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>删除文章</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-small text-text-secondary">
                删除后文章与其标签关联将一并移除，操作不可恢复。
              </p>
              <div>
                <DeleteBlogPostButton id={post.id} title={post.title} redirectTo="/blog" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-caption text-text-muted">{label}</span>
      <span className="text-right text-small text-foreground">{value}</span>
    </div>
  );
}
