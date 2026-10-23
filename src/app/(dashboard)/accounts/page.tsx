import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import {
  listAccounts,
  listAssignableRoles,
  type AccountListItem,
} from '@/lib/rbac';
import { AccountStatusButton } from './account-status-button';
import { ResetPasswordButton } from './reset-password-button';
import { withBasePath } from '@/lib/base-path';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '账号管理',
  description: '管理后台员工账号：姓名、登录邮箱、职位、小满/阿里账号、角色与账号状态。',
};

const PAGE_SIZE = 20;

/**
 * 账号列表（Phase 4.6）。
 *
 * 筛选：关键词（姓名或邮箱）/ 职位 / 角色 / 账号状态，分页。
 * 数据来自后端 GET /api/v1/cms/accounts（accounts.read）。
 */
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    keyword?: string;
    jobTitle?: string;
    roleId?: string;
    isActive?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const keyword = params.keyword?.trim() || undefined;
  const jobTitle = params.jobTitle?.trim() || undefined;
  const roleId = params.roleId?.trim() || undefined;
  const isActive =
    params.isActive === 'true' ? true : params.isActive === 'false' ? false : undefined;

  const token = await getSessionToken();
  const [result, rolesResult, adminResult] = await Promise.all([
    listAccounts(token, { page, limit: PAGE_SIZE, keyword, jobTitle, roleId, isActive }),
    listAssignableRoles(token),
    getCurrentAdmin(token),
  ]);

  const admin: AdminProfile | null = adminResult.ok ? adminResult.data : null;
  const canCreate = hasPermission(admin, 'accounts.create');
  const canUpdate = hasPermission(admin, 'accounts.update');
  const canDisable = hasPermission(admin, 'accounts.disable');
  const roles = rolesResult.ok ? rolesResult.data : [];

  const buildHref = (next: {
    page?: number;
    keyword?: string;
    jobTitle?: string;
    roleId?: string;
    isActive?: string;
  }) => {
    const search = new URLSearchParams();
    const finalPage = next.page ?? 1;
    if (finalPage > 1) search.set('page', String(finalPage));
    const finalKeyword = next.keyword === undefined ? keyword : next.keyword;
    if (finalKeyword) search.set('keyword', finalKeyword);
    const finalJobTitle = next.jobTitle === undefined ? jobTitle : next.jobTitle;
    if (finalJobTitle) search.set('jobTitle', finalJobTitle);
    const finalRoleId = next.roleId === undefined ? roleId : next.roleId;
    if (finalRoleId) search.set('roleId', finalRoleId);
    const finalIsActive =
      next.isActive === undefined ? (isActive === undefined ? undefined : String(isActive)) : next.isActive;
    if (finalIsActive) search.set('isActive', finalIsActive);
    const query = search.toString();
    return query ? `/accounts?${query}` : '/accounts';
  };

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="账号管理"
        description="管理后台员工账号。新账号创建时生成一次性初始口令，请及时转交员工并提醒修改。"
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/accounts/new">新建账号</Link>
            </Button>
          ) : null
        }
      />

      {/* 搜索 + 筛选 */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action={withBasePath('/accounts')} method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="keyword" className="text-small font-medium text-foreground">
            搜索
          </label>
          <input
            id="keyword"
            name="keyword"
            type="search"
            defaultValue={keyword ?? ''}
            placeholder="姓名或登录邮箱"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-44 flex-col gap-1.5">
          <label htmlFor="jobTitle" className="text-small font-medium text-foreground">
            职位
          </label>
          <input
            id="jobTitle"
            name="jobTitle"
            type="text"
            defaultValue={jobTitle ?? ''}
            placeholder="按职位筛选"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-44 flex-col gap-1.5">
          <label htmlFor="roleId" className="text-small font-medium text-foreground">
            角色
          </label>
          <select
            id="roleId"
            name="roleId"
            defaultValue={roleId ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部角色</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-36 flex-col gap-1.5">
          <label htmlFor="isActive" className="text-small font-medium text-foreground">
            状态
          </label>
          <select
            id="isActive"
            name="isActive"
            defaultValue={isActive === undefined ? '' : String(isActive)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">全部状态</option>
            <option value="true">启用</option>
            <option value="false">已停用</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          筛选
        </Button>
        {keyword || jobTitle || roleId || isActive !== undefined ? (
          <Button asChild variant="ghost">
            <Link href="/accounts">重置</Link>
          </Button>
        ) : null}
      </form>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载账号列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无账号</p>
            <p className="mt-1 text-small text-text-secondary">
              {keyword || jobTitle || roleId || isActive !== undefined
                ? '当前筛选条件下没有账号，试试调整条件。'
                : canCreate
                  ? '点击右上角「新建账号」创建第一个员工账号。'
                  : '暂无可见账号。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-small text-text-secondary">
            共 <span className="font-medium text-foreground">{result.data.total}</span> 个账号
          </p>

          {/* 桌面：表格 */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">员工</th>
                  <th className="px-4 py-3 font-medium">职位</th>
                  <th className="px-4 py-3 font-medium">小满账号</th>
                  <th className="px-4 py-3 font-medium">阿里账号</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">最近登录</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <AccountRow
                    key={item.id}
                    account={item}
                    canUpdate={canUpdate}
                    canDisable={canDisable}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片列表 */}
          <ul className="mt-3 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-small font-medium text-foreground">
                          {item.name ?? '—'}
                        </span>
                        <div className="text-caption text-text-muted">{item.email}</div>
                      </div>
                      {item.isActive ? (
                        <Badge variant="success">启用</Badge>
                      ) : (
                        <Badge variant="destructive">已停用</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.length === 0 ? (
                        <Badge variant="outline">未分配角色</Badge>
                      ) : (
                        item.roles.map((role) => (
                          <Badge key={role.id} variant="secondary">
                            {role.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    {item.okkiAccount || item.alibabaAccount ? (
                      <div className="text-caption text-text-muted">
                        小满：{item.okkiAccount ?? '—'}　阿里：{item.alibabaAccount ?? '—'}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      {canUpdate ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/accounts/${item.id}/edit`}>编辑</Link>
                        </Button>
                      ) : null}
                      {canDisable ? (
                        <AccountStatusButton
                          id={item.id}
                          isActive={item.isActive}
                          name={item.name ?? item.email}
                          isProtected={item.isProtected}
                        />
                      ) : null}
                      {canUpdate ? <ResetPasswordButton id={item.id} name={item.name ?? item.email} /> : null}
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
                    <Link href={buildHref({ page: result.data.page - 1 })}>上一页</Link>
                  </Button>
                ) : null}
                {result.data.page < result.data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref({ page: result.data.page + 1 })}>下一页</Link>
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

/* ------------------------------ 局部组件 ------------------------------ */

function AccountRow({
  account,
  canUpdate,
  canDisable,
}: {
  account: AccountListItem;
  canUpdate: boolean;
  canDisable: boolean;
}) {
  return (
    <tr className="border-t border-border hover:bg-table-row-hover">
      <td className="px-4 py-3">
        <Link
          href={`/accounts/${account.id}/edit`}
          className="text-small font-medium text-primary hover:underline"
        >
          {account.name ?? '—'}
        </Link>
        <div className="text-caption text-text-muted">{account.email}</div>
      </td>
      <td className="px-4 py-3 text-small text-text-secondary">{account.jobTitle ?? '—'}</td>
      <td className="px-4 py-3 text-small text-text-secondary">{account.okkiAccount ?? '—'}</td>
      <td className="px-4 py-3 text-small text-text-secondary">{account.alibabaAccount ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {account.roles.length === 0 ? (
            <Badge variant="outline">未分配角色</Badge>
          ) : (
            account.roles.map((role) => (
              <Badge key={role.id} variant="secondary">
                {role.name}
              </Badge>
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {account.isActive ? (
          <Badge variant="success">启用</Badge>
        ) : (
          <Badge variant="destructive">已停用</Badge>
        )}
        {account.isProtected ? (
          <div className="mt-1 text-caption text-text-muted">受保护账号</div>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-small text-text-secondary">
        {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : '从未登录'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {canUpdate ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/accounts/${account.id}/edit`}>编辑</Link>
            </Button>
          ) : null}
          {canDisable ? (
            <AccountStatusButton
              id={account.id}
              isActive={account.isActive}
              name={account.name ?? account.email}
              isProtected={account.isProtected}
            />
          ) : null}
          {canUpdate ? <ResetPasswordButton id={account.id} name={account.name ?? account.email} /> : null}
        </div>
      </td>
    </tr>
  );
}

/** 供移动端卡片复用的类型导出 */
export type { AccountListItem };
