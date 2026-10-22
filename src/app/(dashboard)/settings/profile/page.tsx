import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getMyProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '账号设置',
  description: '维护你自己的账号资料与官网展示联系方式（姓名、邮箱、WhatsApp、手机号）。',
};

/**
 * 账号设置（自助资料维护）。
 *
 * 数据来源：GET /auth/profile（账号档案 + 自己的联系方式）。
 * 无需 contacts.update 权限——员工改自己的资料属于自助行为，
 * 但只能改自己（后端按 JWT 里的 sub 定位，请求体无法指定他人）。
 */
export default async function AccountSettingsPage() {
  const token = await getSessionToken();
  const result = await getMyProfile(token);

  if (!result.ok && result.status === 401) redirect('/login');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="账号设置"
        description="维护你自己的账号资料；「官网展示信息」决定客户在联系页看到的内容。"
      />

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载账号资料</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : (
        <ProfileForm profile={result.data.profile} contact={result.data.contact} />
      )}
    </Container>
  );
}
