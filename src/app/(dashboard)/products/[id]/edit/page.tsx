import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { getProduct, listCategories } from '@/lib/products';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getContentPreview, type ContentPreview } from '@/lib/publishing';
import { ProductForm } from '../../product-form';
import { PublishControls } from '../../../publish-controls';
import { ImageManager } from './image-manager';
import { DeleteProductZone } from './delete-product-zone';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑产品',
  description: '编辑产品信息、管理图片或删除产品。',
};

/** 编辑产品页：复用创建表单 + 发布面板 + 图片管理 + 删除产品 */
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();

  const [productResult, categoriesResult, previewResult, admin] = await Promise.all([
    getProduct(token, id),
    listCategories(token),
    getContentPreview<{ slug: string }>(token, 'products', id),
    getCurrentAdmin(token) as Promise<
      { ok: true; data: AdminProfile } | { ok: false; error: string; status: number }
    >,
  ]);

  if (!productResult.ok) {
    return (
      <Container width="page" className="py-8">
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载产品数据</p>
            <p className="text-small text-text-secondary">{productResult.error}</p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/products">返回产品列表</Link>
            </Button>
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
            <p className="text-body font-medium text-foreground">无法加载分类列表</p>
            <p className="text-small text-text-secondary">{categoriesResult.error}</p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/products">返回产品列表</Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const product = productResult.data;
  const preview = previewResult.ok ? (previewResult.data as ContentPreview<{ slug: string }>) : null;
  const canPublish = hasPermission(admin.ok ? admin.data : null, 'products.publish');
  const canUnpublish = hasPermission(admin.ok ? admin.data : null, 'products.unpublish');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`编辑：${product.name}`}
        description="修改产品信息、管理图片。保存只写编辑稿，上线需点「发布」。"
        breadcrumb={
          <Link href="/products" className="hover:text-foreground">
            产品管理
          </Link>
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ProductForm categories={categoriesResult.data} product={product} />
        <div className="flex flex-col gap-6">
          <PublishControls
            kind="products"
            id={product.id}
            status={preview?.status ?? product.status}
            publishedVersion={preview?.publishedVersion ?? 0}
            hasUnpublishedChanges={preview?.hasUnpublishedChanges ?? false}
            revalidatePaths={['/products', `/products/${product.id}/edit`]}
            canPublish={canPublish}
            canUnpublish={canUnpublish}
            publicHref={`/products/${product.slug}`}
            previewHref={`/preview/products/${product.id}`}
          />
          <ImageManager productId={product.id} images={product.images} />
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <DeleteProductZone id={product.id} name={product.name} />
      </div>
    </Container>
  );
}
