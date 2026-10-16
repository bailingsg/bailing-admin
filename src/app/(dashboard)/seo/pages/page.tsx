import { SeoEntityList } from '../seo-entity-list';

export const metadata = {
  title: 'SEO · Pages',
  description: '管理全站静态页面的 SEO 元数据。',
};

/** SEO → Pages（任务书第十三节） */
export default function SeoPagesPage() {
  return (
    <SeoEntityList
      scope="pages"
      title="页面 SEO"
      description="管理首页 / 产品 / 应用 / 工厂 / 质量 / 关于 / 联系 / 博客列表页的元数据。留空时由标题模板自动兜底。"
    />
  );
}
