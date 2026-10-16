'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/lib/rbac';
import { upsertContactAction } from './actions';

/** 后端同款 WhatsApp 归一化规则：仅数字（可含空格 / 连字符 / 括号），必须以 + 开头，总长 8–15 位 */
function normalizeWhatsapp(raw: string): string | null {
  const stripped = raw.replace(/[\s\-()[\]]/g, '');
  return /^\+\d{8,15}$/.test(stripped) ? stripped : null;
}

const WHATSAPP_HINT =
  '请填写完整国际号码，以 + 和国家代码开头（如 +8613800138000），仅含数字，可含空格或连字符。';

/**
 * 联系方式表单弹窗（创建 / 更新共用）。
 *
 * 防幽灵员工：员工下拉只列出系统中**真实存在且尚未绑定**联系方式的账号；
 * 编辑时员工固定不可改（每个员工一条，按 adminUserId 幂等）。
 */
export function ContactFormModal({
  mode,
  employees,
  contact,
  presetAdminUserId,
  triggerLabel,
}: {
  mode: 'create' | 'edit';
  employees: { id: string; name: string | null; email: string; jobTitle: string | null }[];
  contact?: Contact;
  presetAdminUserId?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [adminUserId, setAdminUserId] = React.useState(presetAdminUserId ?? '');
  const [displayName, setDisplayName] = React.useState(contact?.displayName ?? '');
  const [jobTitle, setJobTitle] = React.useState(contact?.jobTitle ?? '');
  const [displayEmail, setDisplayEmail] = React.useState(contact?.displayEmail ?? '');
  const [whatsapp, setWhatsapp] = React.useState(contact?.whatsapp ?? '');
  const [showOnSite, setShowOnSite] = React.useState(contact?.showOnSite ?? true);
  const [isLeadContact, setIsLeadContact] = React.useState(contact?.isLeadContact ?? false);
  const [sortOrder, setSortOrder] = React.useState(String(contact?.sortOrder ?? 0));
  const [internalNote, setInternalNote] = React.useState(contact?.internalNote ?? '');

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setAdminUserId(contact?.adminUserId ?? presetAdminUserId ?? '');
    setDisplayName(contact?.displayName ?? '');
    setJobTitle(contact?.jobTitle ?? '');
    setDisplayEmail(contact?.displayEmail ?? '');
    setWhatsapp(contact?.whatsapp ?? '');
    setShowOnSite(contact?.showOnSite ?? true);
    setIsLeadContact(contact?.isLeadContact ?? false);
    setSortOrder(String(contact?.sortOrder ?? 0));
    setInternalNote(contact?.internalNote ?? '');
  }, [open, contact, presetAdminUserId]);

  function submit() {
    setError(null);

    const targetEmployeeId = contact?.adminUserId ?? adminUserId;
    if (!targetEmployeeId) {
      setError('请选择要绑定联系方式的员工');
      return;
    }
    const name = displayName.trim();
    if (name.length < 2 || name.length > 50) {
      setError('请填写展示名（2–50 个字符）');
      return;
    }
    const email = displayEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('展示邮箱格式不正确');
      return;
    }
    const wa = whatsapp.trim();
    if (wa && !normalizeWhatsapp(wa)) {
      setError(WHATSAPP_HINT);
      return;
    }
    const order = Number.parseInt(sortOrder, 10);
    if (!Number.isFinite(order) || order < 0 || order > 9999) {
      setError('排序必须是 0–9999 之间的整数');
      return;
    }

    startTransition(async () => {
      const result = await upsertContactAction({
        adminUserId: targetEmployeeId,
        displayName: name,
        jobTitle: jobTitle.trim() || undefined,
        displayEmail: email || undefined,
        whatsapp: wa ? normalizeWhatsapp(wa)! : undefined,
        showOnSite,
        isLeadContact,
        sortOrder: order,
        internalNote: internalNote.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant={mode === 'create' ? 'default' : 'outline'} onClick={() => setOpen(true)}>
        {triggerLabel ?? (mode === 'create' ? '添加联系方式' : '编辑')}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? '添加联系方式' : `编辑联系方式：${contact?.displayName ?? ''}`}
        description="联系方式绑定真实员工账号；展示邮箱与登录邮箱相互独立，官网只展示此处填写的信息。"
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {mode === 'create' ? (
            <FormField label="员工账号" htmlFor="contact-employee" required hint="只列出尚未绑定联系方式的真实员工账号">
              <select
                id="contact-employee"
                value={adminUserId}
                onChange={(event) => setAdminUserId(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">请选择员工</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name ?? employee.email}（{employee.email}）
                    {employee.jobTitle ? ` · ${employee.jobTitle}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-caption text-text-muted">绑定员工（不可修改）</p>
              <p className="text-small text-foreground">
                {contact?.employee.name ?? '—'} · 登录邮箱 {contact?.employee.loginEmail}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="展示名" htmlFor="contact-display-name" required hint="官网上显示的姓名，可与账号姓名不同">
              <Input
                id="contact-display-name"
                value={displayName}
                maxLength={50}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="对外展示的姓名"
              />
            </FormField>
            <FormField label="展示职位" htmlFor="contact-job-title" hint="选填，如 Export Manager">
              <Input
                id="contact-job-title"
                value={jobTitle}
                maxLength={80}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="对外展示的职位"
              />
            </FormField>
            <FormField
              label="展示邮箱"
              htmlFor="contact-display-email"
              hint="选填；与登录邮箱独立，留空则官网不展示邮箱"
            >
              <Input
                id="contact-display-email"
                type="email"
                value={displayEmail}
                maxLength={120}
                onChange={(event) => setDisplayEmail(event.target.value)}
                placeholder="sales@company.com"
              />
            </FormField>
            <FormField label="WhatsApp" htmlFor="contact-whatsapp" hint={WHATSAPP_HINT}>
              <Input
                id="contact-whatsapp"
                value={whatsapp}
                maxLength={20}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+8613800138000"
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-small text-foreground">
              <input
                type="checkbox"
                checked={showOnSite}
                onChange={(event) => setShowOnSite(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              在官网展示该联系人
            </label>
            <label className="flex items-center gap-2 text-small text-foreground">
              <input
                type="checkbox"
                checked={isLeadContact}
                onChange={(event) => setIsLeadContact(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              标记为询盘联系人（参与询盘自动分配）
            </label>
            <label className="flex items-center gap-2 text-small text-foreground">
              排序
              <Input
                type="number"
                min={0}
                max={9999}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="h-8 w-20 text-small"
                aria-label="排序"
              />
            </label>
          </div>

          <FormField
            label="内部备注"
            htmlFor="contact-internal-note"
            hint="仅后台可见，官网接口不会返回该内容"
          >
            <textarea
              id="contact-internal-note"
              value={internalNote}
              maxLength={2000}
              rows={3}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="内部沟通备注，例如负责区域、跟进偏好"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </FormField>

          {error ? (
            <p role="alert" className="text-small text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
