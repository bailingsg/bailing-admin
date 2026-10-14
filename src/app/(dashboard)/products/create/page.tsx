import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listCategories } from '@/lib/products';
import { ProductForm } from '../product-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '新建产品',
  description: '创建新产品（支持草稿与直接发布）。',
};

/** 新建产品页：从后端拉取真实分类列表供选择 */
export default async function CreateProductPage() {
  const token = await getSessionToken();
  const categoriesResult = await listCategories(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="新建产品"
        description="填写产品信息后创建；创建页保存为草稿，发布后官网立即可见。"
        breadcrumb={
          <Link href="/products" className="hover:text-foreground">
            产品管理
          </Link>
        }
      />

      {!categoriesResult.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-2 py-8">
            <p className="text-body font-medium text-foreground">无法加载分类列表</p>
            <p className="text-small text-text-secondary">{categoriesResult.error}</p>
            <p className="text-caption text-text-muted">请确认后端服务已启动后刷新页面。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          <ProductForm categories={categoriesResult.data} />
        </div>
      )}
    </Container>
  );
}
