import { SeoEntityList } from '../seo-entity-list';

export const metadata = {
  title: 'SEO · Products',
  description: '管理产品详情页的 SEO 元数据。',
};

/** SEO → Products（任务书第十四节；与 Products CMS 数据同步，不复制产品数据） */
export default function SeoProductsPage() {
  return (
    <SeoEntityList
      scope="products"
      title="产品 SEO"
      description="与 Products CMS 实时同步：本页只管理 SEO 元数据，产品本身仍在 Products 模块维护。"
    />
  );
}
