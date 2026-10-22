'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/components/ui/toast';
import type { AdminProfile, MyContact } from '@/lib/api';
import { updateMyProfileAction } from './actions';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 后端同款国际号码归一化：仅数字（可含空格/连字符/括号），必须以 + 开头，总长 8–15 位 */
function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-()[\]]/g, '');
  return /^\+\d{8,15}$/.test(stripped) ? stripped : null;
}

const PHONE_HINT =
  '请填写完整国际号码，以 + 和国家代码开头（如 +8613800138000），仅含数字，可含空格或连字符。';

/** 账号信息初始值（未绑联系方式时，展示名/展示职位用账号信息兜底，减少重复输入） */
function initialState(profile: AdminProfile, contact: MyContact | null) {
  const exists = Boolean(contact);
  return {
    name: profile.name ?? '',
    email: profile.email,
    jobTitle: profile.jobTitle ?? '',
    // 已有联系方式：如实回填（含空串，清空后刷新不会再被账号职位覆盖）
    displayName: exists ? contact!.displayName : (profile.name ?? ''),
    displayJobTitle: exists ? (contact!.jobTitle ?? '') : (profile.jobTitle ?? ''),
    displayEmail: exists ? (contact!.displayEmail ?? '') : '',
    whatsapp: exists ? (contact!.whatsapp ?? '') : '',
    phone: exists ? (contact!.phone ?? '') : '',
    showOnSite: exists ? contact!.showOnSite : false,
  };
}

/**
 * 账号设置表单（自助维护）。
 *
 * 两段式结构：
 *   1) 账号信息 —— 姓名 / 登录邮箱 / 职位（影响登录与后台显示）
 *   2) 官网展示信息 —— 展示名 / 展示职位 / 展示邮箱 / WhatsApp / 手机号（官网联系页展示）
 *
 * 语义与后端一致：不传 = 不改，清空输入框 = 清空该展示字段。
 * 登录邮箱改动需全站唯一；官网只展示「展示邮箱」，与登录邮箱相互独立。
 */
export function ProfileForm({
  profile,
  contact,
}: {
  profile: AdminProfile;
  contact: MyContact | null;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(() => initialState(profile, contact));
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const emailChanged = form.email.trim().toLowerCase() !== profile.email.toLowerCase();
  const showOnSiteChanged = form.showOnSite !== (contact?.showOnSite ?? false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setError(null);

    const name = form.name.trim();
    if (name.length < 2 || name.length > 50) {
      setError('请填写姓名（2–50 个字符）');
      return;
    }
    const email = form.email.trim();
    if (!EMAIL_REGEX.test(email)) {
      setError('登录邮箱格式不正确');
      return;
    }
    const displayName = form.displayName.trim();
    if (displayName.length < 2 || displayName.length > 50) {
      setError('请填写对外展示名（2–50 个字符）');
      return;
    }
    const displayEmail = form.displayEmail.trim();
    if (displayEmail && !EMAIL_REGEX.test(displayEmail)) {
      setError('展示邮箱格式不正确');
      return;
    }
    const whatsapp = form.whatsapp.trim();
    const phone = form.phone.trim();
    if (whatsapp && !normalizePhone(whatsapp)) {
      setError(`WhatsApp：${PHONE_HINT}`);
      return;
    }
    if (phone && !normalizePhone(phone)) {
      setError(`手机号：${PHONE_HINT}`);
      return;
    }

    startTransition(async () => {
      const result = await updateMyProfileAction({
        name,
        email,
        jobTitle: form.jobTitle.trim(),
        displayName,
        displayJobTitle: form.displayJobTitle.trim(),
        displayEmail,
        whatsapp,
        phone,
        showOnSite: form.showOnSite,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast('账号资料已保存');
      router.refresh();
    });
  }

  return (
    <form
      className="mt-6 flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>账号信息</CardTitle>
          <CardDescription>
            姓名、职位用于后台显示；登录邮箱即登录账号，修改后下次登录请使用新邮箱。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">姓名</Label>
            <Input
              id="profile-name"
              value={form.name}
              maxLength={50}
              onChange={(event) => set('name', event.target.value)}
              placeholder="你的姓名"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">登录邮箱</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email}
              maxLength={120}
              onChange={(event) => set('email', event.target.value)}
              placeholder="如 name@company.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-job-title">职位</Label>
            <Input
              id="profile-job-title"
              value={form.jobTitle}
              maxLength={80}
              onChange={(event) => set('jobTitle', event.target.value)}
              placeholder="如 Export Sales Manager"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-foreground">角色（只读）</span>
            <p className="h-10 px-3 py-2.5 text-small text-text-secondary">
              {profile.roles.length > 0 ? profile.roles.join(' / ') : (profile.role === 'ADMIN' ? '超级管理员' : '内容编辑')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>官网展示信息</CardTitle>
          <CardDescription>
            客户在联系页看到的内容。展示邮箱、手机号与登录邮箱相互独立：留空的字段官网不展示。
            {contact ? '' : '首次保存后自动创建你的对外联系方式。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-display-name">展示名</Label>
            <Input
              id="profile-display-name"
              value={form.displayName}
              maxLength={50}
              onChange={(event) => set('displayName', event.target.value)}
              placeholder="官网上显示的姓名"
            />
            <p className="text-caption text-text-muted">2–50 个字符，可与账号姓名不同</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-display-job-title">展示职位</Label>
            <Input
              id="profile-display-job-title"
              value={form.displayJobTitle}
              maxLength={80}
              onChange={(event) => set('displayJobTitle', event.target.value)}
              placeholder="如 Export Manager"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-display-email">展示邮箱</Label>
            <Input
              id="profile-display-email"
              type="email"
              value={form.displayEmail}
              maxLength={120}
              onChange={(event) => set('displayEmail', event.target.value)}
              placeholder="如 sales@bailingwooden.com"
            />
            <p className="text-caption text-text-muted">选填；留空则官网不展示邮箱</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-whatsapp">WhatsApp</Label>
            <Input
              id="profile-whatsapp"
              value={form.whatsapp}
              maxLength={20}
              onChange={(event) => set('whatsapp', event.target.value)}
              placeholder="如 +8613800138000"
            />
            <p className="text-caption text-text-muted">{PHONE_HINT}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-phone">手机号</Label>
            <Input
              id="profile-phone"
              value={form.phone}
              maxLength={20}
              onChange={(event) => set('phone', event.target.value)}
              placeholder="如 +8613800138000"
            />
            <p className="text-caption text-text-muted">{PHONE_HINT}</p>
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-small text-foreground">
              <input
                type="checkbox"
                checked={form.showOnSite}
                onChange={(event) => set('showOnSite', event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              在官网展示我的联系方式
            </label>
          </div>

          {contact ? (
            <div className="sm:col-span-2 rounded-md border border-border px-4 py-3">
              <p className="text-caption text-text-secondary">
                当前状态：
                {contact.showOnSite ? '官网展示中' : '官网未展示'}
                {contact.displayEmail ? ` · 展示邮箱 ${contact.displayEmail}` : ' · 未设置展示邮箱'}
                {contact.whatsapp ? ` · WhatsApp ${contact.whatsapp}` : ''}
                {contact.phone ? ` · 手机 ${contact.phone}` : ''}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showOnSiteChanged ? (
        <p className="-mt-2 text-small text-text-secondary">
          提示：是否展示由管理员统一管理，改动后是否出现在官网联系页以管理员设置为准。
        </p>
      ) : null}

      {emailChanged ? (
        <p className="-mt-2 text-small text-text-secondary">
          修改登录邮箱后，下次登录请使用新邮箱；当前会话继续有效。
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="default" disabled={pending}>
          {pending ? '保存中…' : '保存修改'}
        </Button>
        {profile.lastLoginAt ? (
          <p className="text-caption text-text-muted">
            上次登录：{new Date(profile.lastLoginAt).toLocaleString('zh-CN', { hour12: false })}
          </p>
        ) : null}
      </div>
    </form>
  );
}
