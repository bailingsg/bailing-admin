import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  FACTORY_SECTION_TYPES,
  FACTORY_SECTION_TYPE_LABELS,
  listFactorySections,
  type ContentStatus,
  type FactorySectionType,
} from '@/lib/enterprise';
import { DeleteFactoryButton } from './delete-factory-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '工厂实力',
  description: '管理工厂实力分区：厂区设施、生产设备、生产流程、装柜发货与展会记录。',
};

const PAGE_SIZE = 20;

function isStatus(value: string | undefined): value is ContentStatus {
  return value !== undefined && (CONTENT_STATUSES as string[]).includes(value);
}

function isSectionType(value: string | undefined): value is FactorySectionType {
  return value !== undefined && (FACTORY_SECTION_TYPES as string[]).includes(value);
}

/**
 * 工厂实力列表（Phase 4.5）。
 *
 * 数据来自后端 GET /api/v1/cms/factory（JWT 保护）。
 * 列：封面 / 标题 / 内容类型 / 发布状态 / 排序 / 更新时间 / 操作。
 */
export default async function FactoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; sectionType?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const sectionType = isSectionType(params.sectionType) ? params.sectionType : undefined;
  const status = isStatus(params.status) ? params.status : undefined;

  const token = await getSessionToken();
  const result = await listFactorySections(token, {
    page,
    limit: PAGE_SIZE,
    keyword,
    sectionType,
    status,
  });

  const withFilters = (next: {
    page?: number;
    status?: ContentStatus;
    sectionType?: FactorySectionType;
  }): string => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    if (keyword) search.set('keyword', keyword);
    const finalStatus = next.status === undefined ? status : next.status;
    if (finalStatus) search.set('status', finalStatus);
    const finalType = next.sectionType === undefined ? sectionType : next.sectionType;
    if (finalType) search.set('sectionType', finalType);
    const query = search.toString();
    return query ? `/factory?${query}` : '/factory';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="工厂实力"
        description="管理官网「工厂实力」板块内容：厂区设施、生产设备、生产流程、装柜发货与展会记录。"
        actions={
          <Button asChild size="sm">
            <Link href="/factory/create">新建分区</Link>
          </Button>
        }
      />

      {/* 搜索 + 类型筛选 */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/factory" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="标题 / slug / 摘要关键词"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="sectionType" className="text-small font-medium text-foreground">
            内容类型
          </label>
          <select
            id="sectionType"
            name="sectionType"
            defaultValue={sectionType ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部类型</option>
            {FACTORY_SECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {FACTORY_SECTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Button type="submit" variant="outline" size="default">
          筛选
        </Button>
      </form>

      {/* 状态筛选 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={withFilters({ page: 1, status: undefined })}>
          <Badge variant={!status ? 'default' : 'outline'} className="cursor-pointer">
            全部
          </Badge>
        </Link>
        {CONTENT_STATUSES.map((s) => (
          <Link key={s} href={withFilters({ page: 1, status: s })}>
            <Badge variant={status === s ? 'default' : 'outline'} className="cursor-pointer">
              {CONTENT_STATUS_LABELS[s]}
            </Badge>
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载工厂分区列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无工厂分区</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || status || sectionType
                ? '当前筛选条件下没有内容，试试调整条件。'
                : '点击右上角「新建分区」创建第一项工厂实力内容。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 个分区
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">封面</th>
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">内容类型</th>
                  <th className="px-4 py-3 font-medium">发布状态</th>
                  <th className="px-4 py-3 font-medium">排序</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3">
                      {item.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
                        <img
                          src={item.coverImageUrl}
                          alt={`${item.title} 封面`}
                          className="h-10 w-16 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-border text-caption text-text-muted">
                          无图
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/factory/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <div className="text-caption text-text-muted">{item.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {FACTORY_SECTION_TYPE_LABELS[item.sectionType]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === 'PUBLISHED' ? 'success' : item.status === 'ARCHIVED' ? 'muted' : 'warning'}>
                        {CONTENT_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.sortOrder}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-small text-text-secondary">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/factory/${item.id}/edit`}>编辑</Link>
                        </Button>
                        <DeleteFactoryButton id={item.id} title={item.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/factory/${item.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <Badge variant={item.status === 'PUBLISHED' ? 'success' : item.status === 'ARCHIVED' ? 'muted' : 'warning'}>
                        {CONTENT_STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <span className="text-small text-text-secondary">
                      {FACTORY_SECTION_TYPE_LABELS[item.sectionType]} · 排序 {item.sortOrder}
                    </span>
                    <span className="text-caption text-text-muted">
                      更新于 {formatDateTime(item.updatedAt)}
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/factory/${item.id}/edit`}>编辑</Link>
                      </Button>
                      <DeleteFactoryButton id={item.id} title={item.title} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {result.data.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-small text-text-secondary">
                第 {result.data.page} / {result.data.totalPages} 页
              </span>
              <div className="flex gap-2">
                {result.data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: result.data.page - 1 })}>上一页</Link>
                  </Button>
                ) : null}
                {result.data.page < result.data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={withFilters({ page: result.data.page + 1 })}>下一页</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
