import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import { getAccount } from '@/lib/rbac';
import { AccountForm } from '../../account-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '编辑账号',
  description: '修改员工账号信息与角色分配。',
};

/** 编辑账号（Phase 4.6）：口令不在此页修改，请使用列表中的「重置口令」 */
export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getSessionToken();
  const result = await getAccount(token, id);

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <Container width="page" className="py-8">
        <PageHeader title="编辑账号" description="修改员工账号信息与角色分配。" />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载账号信息</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const account = result.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`编辑账号：${account.name ?? account.email}`}
        description="登录口令不在此页修改，请返回账号列表使用「重置口令」。"
        actions={
          account.isActive ? (
            <Badge variant="success">启用</Badge>
          ) : (
            <Badge variant="destructive">已停用</Badge>
          )
        }
      />

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-6 py-6">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-caption text-text-muted">账号 ID</dt>
              <dd className="text-small text-foreground">{account.id}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">创建时间</dt>
              <dd className="text-small text-foreground">{formatDateTime(account.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">最近登录</dt>
              <dd className="text-small text-foreground">
                {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : '从未登录'}
              </dd>
            </div>
          </dl>

          {account.contact ? (
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-small font-medium text-foreground">员工联系方式</p>
              <p className="mt-1 text-small text-text-secondary">
                展示名：{account.contact.displayName}
                {account.contact.jobTitle ? ` · ${account.contact.jobTitle}` : ''} ·{' '}
                {account.contact.showOnSite ? '公开展示中' : '未公开'} ·{' '}
                {account.contact.isLeadContact ? '询盘联系人' : '非询盘联系人'}
              </p>
            </div>
          ) : (
            <p className="rounded-md border border-border px-4 py-3 text-small text-text-secondary">
              该账号尚未绑定员工联系方式，可到「员工联系方式」中补全。
            </p>
          )}

          <AccountForm mode="edit" account={account} />
        </CardContent>
      </Card>
    </Container>
  );
}
