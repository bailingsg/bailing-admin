import { SeoEntityList } from '../seo-entity-list';

export const metadata = {
  title: 'SEO · Blog',
  description: '管理博客文章的 SEO 元数据。',
};

/** SEO → Blog（任务书第十五节；文章自动支持 Article Schema） */
export default function SeoBlogPage() {
  return (
    <SeoEntityList
      scope="blog"
      title="博客 SEO"
      description="与 Blog CMS 实时同步：本页只管理 SEO 元数据；文章详情页自动输出 Article 结构化数据。"
    />
  );
}
