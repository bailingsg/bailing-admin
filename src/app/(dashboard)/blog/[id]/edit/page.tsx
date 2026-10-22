import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getBlogPost, listBlogCategories, listBlogTags } from '@/lib/blog';
import { listProducts } from '@/lib/products';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getContentPreview, type ContentPreview } from '@/lib/publishing';
import { BlogNav } from '../../blog-nav';
import { BlogPostForm } from '../../post-form';
import { PublishControls } from '../../../publish-controls';
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

  const [postResult, categoriesResult, tagsResult, productsResult, previewResult, admin] =
    await Promise.all([
      getBlogPost(token, id),
      listBlogCategories(token),
      listBlogTags(token),
      // 关联产品选择器数据源（失败不阻塞编辑：选择器会提示产品列表不可用）
      listProducts(token, { limit: 100 }),
      getContentPreview<{ slug: string }>(token, 'blog/posts', id),
      getCurrentAdmin(token) as Promise<
        { ok: true; data: AdminProfile } | { ok: false; error: string; status: number }
      >,
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
  const preview = previewResult.ok ? (previewResult.data as ContentPreview<{ slug: string }>) : null;
  const canPublish = hasPermission(admin.ok ? admin.data : null, 'blog.publish');
  const canUnpublish = hasPermission(admin.ok ? admin.data : null, 'blog.unpublish');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`编辑：${post.title}`}
        description="修改内容、SEO、分类、标签与封面。保存只写编辑稿，上线需点「发布」。"
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
        <BlogPostForm
          categories={categoriesResult.data}
          tags={tagsResult.data}
          products={productsResult.ok ? productsResult.data.items : []}
          post={post}
        />

        <div className="flex flex-col gap-6">
          <PublishControls
            kind="blog/posts"
            id={post.id}
            status={preview?.status ?? post.status}
            publishedVersion={preview?.publishedVersion ?? 0}
            hasUnpublishedChanges={preview?.hasUnpublishedChanges ?? false}
            revalidatePaths={['/blog', `/blog/${post.id}/edit`]}
            canPublish={canPublish}
            canUnpublish={canUnpublish}
            publicHref={`/blog/${post.slug}`}
            previewHref={`/preview/blog/posts/${post.id}`}
          />

          <Card>
            <CardHeader>
              <CardTitle>文章信息</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-small">
              <InfoRow label="精选" value={post.featured ? '是' : '否'} />
              <InfoRow label="分类" value={post.category?.name ?? '未分类'} />
              <InfoRow
                label="标签"
                value={post.tags.length > 0 ? post.tags.map((t) => t.name).join('、') : '—'}
              />
              <InfoRow
                label="关联产品"
                value={
                  post.relatedProducts.length > 0
                    ? post.relatedProducts.map((p) => p.name).join('、')
                    : '—'
                }
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
