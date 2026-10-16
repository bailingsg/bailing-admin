import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { listRoles, type RoleListItem } from '@/lib/rbac';
import { RoleFormModal } from './role-form-modal';
import { DeleteRoleButton } from './delete-role-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '角色与权限',
  description: '管理后台角色与权限：功能权限与导航权限分组配置，变更实时生效并全程留痕。',
};

/**
 * 角色列表（Phase 4.6）。
 *
 * 受保护的 SUPER_ADMIN 角色不可停用 / 改权限 / 删除（后端强制）；
 * 新建角色默认不带任何权限，必须在详情中显式分配。
 */
export default async function RolesPage() {
  const token = await getSessionToken();
  const [result, adminResult] = await Promise.all([listRoles(token, { limit: 100 }), getCurrentAdmin(token)]);

  const admin: AdminProfile | null = adminResult.ok ? adminResult.data : null;
  const canCreate = hasPermission(admin, 'roles.create');
  const canUpdate = hasPermission(admin, 'roles.update');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="角色与权限"
        description="角色决定员工能看到哪些菜单、能调用哪些接口。权限变更在下一次请求时生效，并记录操作人、对象与前后差异。"
        actions={canCreate ? <RoleFormModal mode="create" /> : null}
      />

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载角色列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无角色</p>
            <p className="mt-1 text-small text-text-secondary">
              {canCreate ? '点击右上角「新建角色」创建第一个自定义角色。' : '暂无可见角色。'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left">
            <thead className="bg-table-header">
              <tr className="text-caption text-text-secondary">
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 font-medium">权限</th>
                <th className="px-4 py-3 font-medium">关联账号</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {result.data.items.map((role) => (
                <tr key={role.id} className="border-t border-border hover:bg-table-row-hover">
                  <td className="px-4 py-3">
                    <Link
                      href={`/roles/${role.id}`}
                      className="text-small font-medium text-primary hover:underline"
                    >
                      {role.name}
                    </Link>
                    <div className="text-caption text-text-muted">{role.key}</div>
                  </td>
                  <td className="max-w-72 px-4 py-3 text-small text-text-secondary">
                    {role.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">
                    {role.permissionCount} / {role.totalPermissions}
                  </td>
                  <td className="px-4 py-3 text-small text-text-secondary">{role.userCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={role.status === 'ACTIVE' ? 'success' : 'muted'}>
                        {role.status === 'ACTIVE' ? '生效中' : '已停用'}
                      </Badge>
                      {role.isProtected ? <Badge variant="warning">受保护</Badge> : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-small text-text-secondary">
                    {formatDateTime(role.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/roles/${role.id}`}>权限分配</Link>
                      </Button>
                      {canUpdate ? (
                        <>
                          <RoleFormModal mode="edit" role={role} />
                          <DeleteRoleButton role={role} />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-caption text-text-muted">
        提示：超级管理员（SUPER_ADMIN）为受保护角色，拥有全部权限且不可修改；
        停用角色后，其关联账号在下一次请求时立即失去该角色的权限。
      </p>
    </Container>
  );
}

/** 供行内组件复用的类型导出 */
export type { RoleListItem };
