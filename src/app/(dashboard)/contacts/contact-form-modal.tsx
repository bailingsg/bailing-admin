'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Contact } from '@/lib/rbac';
import {
  removeContactAvatarAction,
  uploadContactAvatarAction,
  upsertContactAction,
} from './actions';
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from './avatar';

/** 后端同款 WhatsApp 归一化规则：仅数字（可含空格 / 连字符 / 括号），必须以 + 开头，总长 8–15 位 */
function normalizeWhatsapp(raw: string): string | null {
  const stripped = raw.replace(/[\s\-()[\]]/g, '');
  return /^\+\d{8,15}$/.test(stripped) ? stripped : null;
}

const WHATSAPP_HINT =
  '请填写完整国际号码，以 + 和国家代码开头（如 +8613800138000），仅含数字，可含空格或连字符。';

/** 手机号与 WhatsApp 同规则；二者相互独立，可只填其一 */
const PHONE_HINT = WHATSAPP_HINT;

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
  const [avatarPending, startAvatarTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = React.useState<string | null>(null);
  /** 头像预览地址：上传成功后由接口返回值更新，避免整页 refetch 才能看到新图 */
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(contact?.avatarUrl ?? null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [adminUserId, setAdminUserId] = React.useState(presetAdminUserId ?? '');
  const [displayName, setDisplayName] = React.useState(contact?.displayName ?? '');
  const [jobTitle, setJobTitle] = React.useState(contact?.jobTitle ?? '');
  const [displayEmail, setDisplayEmail] = React.useState(contact?.displayEmail ?? '');
  const [whatsapp, setWhatsapp] = React.useState(contact?.whatsapp ?? '');
  const [phone, setPhone] = React.useState(contact?.phone ?? '');
  const [showOnSite, setShowOnSite] = React.useState(contact?.showOnSite ?? true);
  const [isLeadContact, setIsLeadContact] = React.useState(contact?.isLeadContact ?? false);
  const [sortOrder, setSortOrder] = React.useState(String(contact?.sortOrder ?? 0));
  const [internalNote, setInternalNote] = React.useState(contact?.internalNote ?? '');

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setAvatarMessage(null);
    setAdminUserId(contact?.adminUserId ?? presetAdminUserId ?? '');
    setDisplayName(contact?.displayName ?? '');
    setJobTitle(contact?.jobTitle ?? '');
    setDisplayEmail(contact?.displayEmail ?? '');
    setWhatsapp(contact?.whatsapp ?? '');
    setPhone(contact?.phone ?? '');
    setShowOnSite(contact?.showOnSite ?? true);
    setIsLeadContact(contact?.isLeadContact ?? false);
    setSortOrder(String(contact?.sortOrder ?? 0));
    setInternalNote(contact?.internalNote ?? '');
    setAvatarPreview(contact?.avatarUrl ?? null);
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
    const tel = phone.trim();
    if (tel && !normalizeWhatsapp(tel)) {
      setError(PHONE_HINT);
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
        phone: tel ? normalizeWhatsapp(tel)! : undefined,
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

  /**
   * 选择文件后立即上传（不经过「保存」按钮）。
   * 用 FormData 直传 multipart——转 base64 走 JSON 会被后端拒。
   */
  function submitAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 重置 input，保证连续选同一个文件也能触发 change
    event.target.value = '';
    if (!file) return;
    if (!contact) return;

    setAvatarMessage(null);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    startAvatarTransition(async () => {
      const result = await uploadContactAvatarAction(contact.id, formData);
      if (!result.ok) {
        setAvatarMessage(result.error);
        return;
      }
      setAvatarPreview(result.data.avatarUrl ?? null);
      setAvatarMessage('头像已更新（旧头像已从存储中删除）');
      router.refresh();
    });
  }

  /** 移除头像：后端同步删除存储对象，不留孤儿文件 */
  function removeAvatar() {
    if (!contact) return;
    setAvatarMessage(null);
    setError(null);

    startAvatarTransition(async () => {
      const result = await removeContactAvatarAction(contact.id);
      if (!result.ok) {
        setAvatarMessage(result.error);
        return;
      }
      setAvatarPreview(null);
      setAvatarMessage('头像已移除');
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

          {/* 头像：仅编辑态可操作（新建时还没有 contactId 可挂载） */}
          {mode === 'edit' && contact ? (
            <div className="rounded-md border border-border px-4 py-3">
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
                  <img
                    src={avatarPreview}
                    alt={`${displayName || contact.displayName} 的头像`}
                    className="size-16 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface text-heading-sm text-text-muted"
                  >
                    {(displayName || contact.displayName).trim().slice(0, 1) || '?'}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={avatarPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarPending ? '上传中…' : avatarPreview ? '更换头像' : '上传头像'}
                    </Button>
                    {avatarPreview ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={avatarPending}
                        onClick={removeAvatar}
                      >
                        移除头像
                      </Button>
                    ) : null}
                  </div>
                  {/* input 隐藏：由上面的按钮触发，避免原生文件选择器的难看样式 */}
                  <input
                    ref={fileInputRef}
                    id="contact-avatar"
                    type="file"
                    accept={AVATAR_ACCEPT}
                    className="hidden"
                    onChange={submitAvatar}
                  />
                  <p className="text-caption text-text-muted">
                    仅支持 JPEG / PNG / WebP / AVIF，不超过 {Math.floor(AVATAR_MAX_BYTES / 1024 / 1024)}MB。
                    更换时新头像上传成功后会**自动删除存储中的旧头像**。
                  </p>
                  {avatarMessage ? (
                    <p
                      role="status"
                      className={
                        /失败|错误|不支持|超过/.test(avatarMessage)
                          ? 'text-small text-destructive'
                          : 'text-small text-text-secondary'
                      }
                    >
                      {avatarMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

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
            <FormField label="手机号" htmlFor="contact-phone" hint={PHONE_HINT}>
              <Input
                id="contact-phone"
                value={phone}
                maxLength={20}
                onChange={(event) => setPhone(event.target.value)}
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

          {/* 联动说明：官网「订单背后的人」不再用关于页的静态团队照片，
              直接读这两项都勾选的员工，因此这里必须把条件写清楚 */}
          <p className="rounded-md border border-border bg-surface px-4 py-3 text-caption text-text-muted">
            关于页「订单背后的人」展示的是
            <span className="font-semibold text-foreground">同时勾选</span>
            「在官网展示该联系人」和「标记为询盘联系人」的同事，
            头像即此处上传的头像，保存后官网立即更新。
          </p>

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
