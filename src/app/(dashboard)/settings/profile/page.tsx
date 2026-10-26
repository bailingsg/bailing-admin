import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getMyProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { AvatarCard } from './avatar-card';
import { ChangePasswordForm } from './change-password-form';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '账号设置',
  description: '维护你自己的头像、账号资料、官网展示联系方式与登录口令。',
};

/**
 * 账号设置（自助）。
 *
 * 数据来源：GET /auth/profile（账号档案 + 自己的联系方式）。
 * 无需 contacts.update 权限——员工改自己的资料/头像/口令属于自助行为，
 * 但只能改自己（后端按 JWT 里的 sub 定位，请求体无法指定他人）。
 *
 * 区块顺序：头像 → 账号与官网展示信息 → 修改口令。
 * 头像独立上传（选文件即生效），不依赖下方表单的「保存修改」。
 */
export default async function AccountSettingsPage() {
  const token = await getSessionToken();
  const result = await getMyProfile(token);

  if (!result.ok && result.status === 401) redirect('/login');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="账号设置"
        description="维护你自己的头像、账号资料与登录口令；「官网展示信息」决定客户在联系页看到的内容。"
      />

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载账号资料</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <AvatarCard
            name={result.data.profile.name ?? result.data.profile.email}
            avatarUrl={result.data.contact?.avatarUrl ?? null}
          />
          <ProfileForm profile={result.data.profile} contact={result.data.contact} />
          <ChangePasswordForm />
        </div>
      )}
    </Container>
  );
}
