import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { getSessionToken } from '@/lib/session';
import { listCategories } from '@/lib/products';
import { CategoryManager } from './category-manager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '产品分类',
  description: '管理产品分类（名称、slug、排序与上下架）。',
};

/** 产品分类管理页（数据来自后端 GET /cms/product-categories，JWT 保护） */
export default async function CategoriesPage() {
  const token = await getSessionToken();
  const result = await listCategories(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="产品分类"
        description="分类用于组织官网产品导航；删除分类前请先移动或删除该分类下的产品。"
      />

      {!result.ok ? (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-small text-destructive">
          无法加载分类列表：{result.error}
        </div>
      ) : (
        <div className="mt-6">
          <CategoryManager categories={result.data} />
        </div>
      )}
    </Container>
  );
}
