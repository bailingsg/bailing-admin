import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getPermissionMatrix, getRole } from '@/lib/rbac';
import { PermissionEditor } from './permission-editor';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '角色权限分配',
  description: '按模块分组配置角色权限，区分功能权限与导航权限。',
};

/** 角色详情与权限分配（Phase 4.6） */
export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getSessionToken();
  const [roleResult, matrixResult] = await Promise.all([
    getRole(token, id),
    getPermissionMatrix(token),
  ]);

  if (!roleResult.ok) {
    if (roleResult.status === 404) notFound();
    return (
      <Container width="page" className="py-8">
        <PageHeader title="角色权限分配" description="按模块分组配置角色权限。" />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载角色信息</p>
            <p className="text-small text-text-secondary">{roleResult.error}</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const role = roleResult.data;

  if (!matrixResult.ok) {
    return (
      <Container width="page" className="py-8">
        <PageHeader title={`角色：${role.name}`} description="按模块分组配置角色权限。" />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载权限矩阵</p>
            <p className="text-small text-text-secondary">{matrixResult.error}</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`角色：${role.name}`}
        description={`标识 ${role.key} · ${role.description ?? '暂无描述'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={role.status === 'ACTIVE' ? 'success' : 'muted'}>
              {role.status === 'ACTIVE' ? '生效中' : '已停用'}
            </Badge>
            {role.isProtected ? <Badge variant="warning">受保护角色</Badge> : null}
            <Badge variant="outline">
              已分配 {role.permissions.length} / {matrixResult.data.total} 项权限
            </Badge>
          </div>
        }
      />

      {/* 关联账号 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">关联账号（{role.users.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {role.users.length === 0 ? (
            <p className="text-small text-text-secondary">暂无账号关联该角色。</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {role.users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5"
                >
                  <span className="text-small text-foreground">{user.name ?? user.email}</span>
                  <span className="text-caption text-text-muted">{user.email}</span>
                  {user.isActive ? null : <Badge variant="destructive">已停用</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 权限矩阵 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">权限分配</CardTitle>
          <p className="text-caption text-text-muted">
            功能权限控制可调用的接口；导航权限控制侧边栏入口是否显示。超级管理员角色拥有全部权限且不可修改。
          </p>
        </CardHeader>
        <CardContent>
          <PermissionEditor
            roleId={role.id}
            roleName={role.name}
            isProtected={role.isProtected}
            assigned={role.permissions}
            modules={matrixResult.data.modules}
          />
        </CardContent>
      </Card>

      <p className="mt-4 text-caption text-text-muted">
        角色更新于 {formatDateTime(role.updatedAt)}；权限变更在下一次请求时生效，操作人、对象与前后差异均记入审计日志。
      </p>
    </Container>
  );
}
