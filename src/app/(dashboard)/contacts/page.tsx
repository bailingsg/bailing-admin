import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { listContacts, type Contact } from '@/lib/rbac';
import { ContactFormModal } from './contact-form-modal';
import { ContactVisibilityButton } from './visibility-button';
import { DeleteContactButton } from './delete-contact-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '员工联系方式',
  description: '管理对外展示的员工联系方式：展示名、展示邮箱与 WhatsApp（均与登录邮箱相互独立）。',
};

/**
 * 员工联系方式列表（Phase 4.6）。
 *
 * 硬性约束：
 *   · 每条联系方式都绑定**真实存在**的员工账号（防幽灵员工）
 *   · 展示邮箱 / 展示名与登录邮箱相互独立
 *   · WhatsApp 必须是带国际国家代码的完整号码
 *   · 内部备注仅后台可见
 *   · 账号停用的员工不会出现在公开接口中
 */
export default async function ContactsPage() {
  const token = await getSessionToken();
  const [result, adminResult] = await Promise.all([listContacts(token), getCurrentAdmin(token)]);

  const admin: AdminProfile | null = adminResult.ok ? adminResult.data : null;
  const canUpdate = hasPermission(admin, 'contacts.update');

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="员工联系方式"
        description="对外展示的联系人信息。账号停用的员工自动从官网撤下，但历史询盘分配记录保留。"
        actions={canUpdate && result.ok ? <ContactFormModal mode="create" employees={result.data.employeesWithoutContact} /> : null}
      />

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载联系方式列表</p>
            <p className="text-small text-text-secondary">{result.error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 未绑定联系方式的真实员工 */}
          {result.data.employeesWithoutContact.length > 0 ? (
            <Card className="mt-6">
              <CardContent className="flex flex-col gap-3 py-5">
                <p className="text-small font-medium text-foreground">
                  以下员工账号尚未绑定联系方式（{result.data.employeesWithoutContact.length}）
                </p>
                <ul className="flex flex-wrap gap-2">
                  {result.data.employeesWithoutContact.map((employee) => (
                    <li key={employee.id}>
                      {canUpdate ? (
                        <ContactFormModal
                          mode="create"
                          employees={result.data.employeesWithoutContact}
                          presetAdminUserId={employee.id}
                          triggerLabel={`为 ${employee.name ?? employee.email} 添加`}
                        />
                      ) : (
                        <Badge variant="outline">{employee.name ?? employee.email}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {result.data.items.length === 0 ? (
            <Card className="mt-6">
              <CardContent className="py-10 text-center">
                <p className="text-body font-medium text-foreground">暂无联系方式</p>
                <p className="mt-1 text-small text-text-secondary">
                  {canUpdate
                    ? '点击右上角「添加联系方式」，为真实员工账号绑定对外联系信息。'
                    : '暂无可见的联系方式。'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-table-header">
                  <tr className="text-caption text-text-secondary">
                    <th className="px-4 py-3 font-medium">展示名</th>
                    <th className="px-4 py-3 font-medium">员工账号</th>
                    <th className="px-4 py-3 font-medium">展示邮箱</th>
                    <th className="px-4 py-3 font-medium">WhatsApp</th>
                    <th className="px-4 py-3 font-medium">手机号</th>
                    <th className="px-4 py-3 font-medium">公开展示</th>
                    <th className="px-4 py-3 font-medium">询盘联系人</th>
                    <th className="px-4 py-3 font-medium">排序</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((contact) => (
                    <tr key={contact.id} className="border-t border-border hover:bg-table-row-hover">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {contact.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
                            <img
                              src={contact.avatarUrl}
                              alt=""
                              className="size-9 shrink-0 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface text-caption text-text-muted"
                            >
                              {contact.displayName.trim().slice(0, 1) || '?'}
                            </div>
                          )}
                          <div>
                            <span className="text-small font-medium text-foreground">
                              {contact.displayName}
                            </span>
                            {contact.jobTitle ? (
                              <div className="text-caption text-text-muted">{contact.jobTitle}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-small text-text-secondary">
                          {contact.employee.name ?? '—'}
                        </span>
                        <div className="text-caption text-text-muted">
                          登录邮箱 {contact.employee.loginEmail}
                        </div>
                        {contact.employee.isActive ? null : (
                          <Badge variant="destructive" className="mt-1">
                            账号已停用
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {contact.displayEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {contact.whatsapp ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {contact.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {contact.showOnSite ? (
                          <Badge variant="success">展示中</Badge>
                        ) : (
                          <Badge variant="muted">已隐藏</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {contact.isLeadContact ? (
                          <Badge variant="warning">询盘联系人</Badge>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">{contact.sortOrder}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate ? (
                            <>
                              <ContactFormModal
                                mode="edit"
                                contact={contact}
                                employees={result.data.employeesWithoutContact}
                              />
                              <ContactVisibilityButton
                                id={contact.id}
                                showOnSite={contact.showOnSite}
                              />
                              <DeleteContactButton id={contact.id} name={contact.displayName} />
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
            提示：WhatsApp 必须填写以 + 和国际国家代码开头的完整号码（如 +8613800138000），系统不做国家代码猜测。
            内部备注仅后台可见，官网不会展示。
          </p>
        </>
      )}
    </Container>
  );
}

/** 供行内组件复用的类型导出 */
export type { Contact };
