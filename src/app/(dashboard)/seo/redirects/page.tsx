import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import { listSeoRedirects } from '@/lib/seo';
import { SeoNav } from '../seo-nav';
import { CreateRedirectModal, DeleteRedirectButton, EditRedirectModal } from './redirect-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO · Redirects',
  description: '301 / 302 重定向管理。',
};

/** SEO → Redirects（任务书二十八节） */
export default async function SeoRedirectsPage() {
  const token = await getSessionToken();
  const result = await listSeoRedirects(token, { limit: 100 });

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="重定向管理"
        description="URL 迁移用 301（默认）；临时调整用 302。后端强制禁止自指向、成环与重复来源；前台 middleware 即时生效。"
        actions={<CreateRedirectModal />}
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载重定向列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.data.items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-body font-medium text-foreground">暂无重定向规则</p>
            <p className="mt-1 text-small text-text-secondary">
              当页面 URL 发生变化时，在此添加 301 迁移规则，避免外链与收录权重丢失。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 桌面：表格 */}
          <div className="mt-6 hidden overflow-hidden rounded-lg border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">状态码</th>
                  <th className="px-4 py-3 font-medium">启用</th>
                  <th className="px-4 py-3 font-medium">命中</th>
                  <th className="px-4 py-3 font-medium">备注</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.items.map((item) => (
                  <tr key={item.id} className="text-small">
                    <td className="px-4 py-3">
                      <code className="text-caption text-foreground">{item.sourcePath}</code>
                    </td>
                    <td className="max-w-72 px-4 py-3 text-text-secondary">
                      <code className="text-caption break-all">{item.targetPath}</code>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">{item.statusCode}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.isActive
                            ? 'inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-caption text-green-700'
                            : 'inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-caption text-text-muted'
                        }
                      >
                        {item.isActive ? '生效中' : '已停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">{item.hits}</td>
                    <td className="px-4 py-3 text-text-secondary">{item.note ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <EditRedirectModal redirect={item} />
                        <DeleteRedirectButton redirect={item} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片 */}
          <div className="mt-6 flex flex-col gap-3 lg:hidden">
            {result.data.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-caption font-medium text-foreground">{item.sourcePath}</code>
                    <span className="text-text-muted">→</span>
                    <code className="text-caption break-all text-text-secondary">{item.targetPath}</code>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
                    <span>{item.statusCode}</span>
                    <span>{item.isActive ? '生效中' : '已停用'}</span>
                    <span>命中 {item.hits}</span>
                    {item.note ? <span>· {item.note}</span> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <EditRedirectModal redirect={item} />
                    <DeleteRedirectButton redirect={item} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}
