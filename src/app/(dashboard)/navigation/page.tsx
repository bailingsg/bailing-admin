import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { NAV_LOCATION_LABELS, listNavItems, type NavLocation } from '@/lib/rbac';
import { NavFormModal } from './nav-form-modal';
import { DeleteNavItemButton } from './delete-nav-item-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '导航管理',
  description: '管理页眉主导航与页脚链接组（链接经安全校验）。',
};

function isLocation(value: string | undefined): value is NavLocation {
  return value === 'HEADER' || value === 'FOOTER';
}

/**
 * 导航管理列表（Phase 4.7）。
 *
 * 页眉 / 页脚链接全部由 CMS 驱动（替换前台硬编码导航）。
 * URL 由后端强制安全校验：仅站内相对路径 / https / mailto / tel。
 */
export default async function NavigationPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const params = await searchParams;
  const location = isLocation(params.location) ? params.location : undefined;

  const token = await getSessionToken();
  const result = await listNavItems(token, { location });

  const headerItems = result.ok ? result.data.items.filter((item) => item.location === 'HEADER') : [];
  const footerItems = result.ok ? result.data.items.filter((item) => item.location === 'FOOTER') : [];

  const withLocation = (next: NavLocation | undefined): string =>
    next ? `/navigation?location=${next}` : '/navigation';

  const renderGroup = (items: typeof headerItems, groupLocation: NavLocation) => (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading-sm font-semibold text-foreground">
          {NAV_LOCATION_LABELS[groupLocation]}
          <span className="ml-2 text-small font-normal text-text-muted">{items.length} 项</span>
        </h2>
        <NavFormModal mode="create" triggerLabel="新建导航项" defaultLocation={groupLocation} />
      </div>

      {items.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="py-8 text-center text-small text-text-secondary">
            暂无导航项，点击右上角「新建导航项」添加。
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
          <table className="w-full border-collapse text-left">
            <thead className="bg-table-header">
              <tr className="text-caption text-text-secondary">
                <th className="px-4 py-3 font-medium">文案</th>
                <th className="px-4 py-3 font-medium">链接</th>
                <th className="px-4 py-3 font-medium">排序</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">新窗口</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                  <td className="px-4 py-3 font-medium text-foreground">{item.label}</td>
                  <td className="px-4 py-3">
                    <code className="rounded-sm bg-muted px-1.5 py-0.5 text-caption text-text-secondary">
                      {item.url}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">{item.sortOrder}</td>
                  <td className="px-4 py-3">
                    {item.isActive ? (
                      <Badge variant="success">启用</Badge>
                    ) : (
                      <Badge variant="muted">停用</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">{item.openInNewTab ? '是' : '否'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <NavFormModal mode="edit" triggerLabel="编辑" item={item} />
                      <DeleteNavItemButton id={item.id} label={item.label} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 移动端：卡片列表 */}
      <ul className="mt-3 flex flex-col gap-3 lg:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <Card>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{item.label}</span>
                  {item.isActive ? (
                    <Badge variant="success">启用</Badge>
                  ) : (
                    <Badge variant="muted">停用</Badge>
                  )}
                </div>
                <code className="w-fit rounded-sm bg-muted px-1.5 py-0.5 text-caption text-text-secondary">
                  {item.url}
                </code>
                <span className="text-small text-text-secondary">
                  排序 {item.sortOrder}
                  {item.openInNewTab ? ' · 新窗口打开' : ''}
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <NavFormModal mode="edit" triggerLabel="编辑" item={item} />
                  <DeleteNavItemButton id={item.id} label={item.label} />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="导航管理"
        description="管理页眉主导航与页脚链接组。链接仅允许站内相对路径（/xxx）、https 外链或 mailto/tel；停用项不会出现在前台。"
      />

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载导航列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 位置筛选 */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <a href={withLocation(undefined)}>
              <Badge variant={!location ? 'default' : 'outline'} className="cursor-pointer">
                全部位置
              </Badge>
            </a>
            {(['HEADER', 'FOOTER'] as NavLocation[]).map((key) => (
              <a key={key} href={withLocation(key)}>
                <Badge variant={location === key ? 'default' : 'outline'} className="cursor-pointer">
                  {NAV_LOCATION_LABELS[key]}
                </Badge>
              </a>
            ))}
          </div>

          {location === 'FOOTER' ? renderGroup(footerItems, 'FOOTER') : null}
          {location === 'HEADER' ? renderGroup(headerItems, 'HEADER') : null}
          {!location ? (
            <>
              {renderGroup(headerItems, 'HEADER')}
              {renderGroup(footerItems, 'FOOTER')}
            </>
          ) : null}
        </>
      )}
    </Container>
  );
}
