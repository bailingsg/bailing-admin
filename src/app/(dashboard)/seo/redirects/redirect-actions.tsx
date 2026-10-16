'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { SeoRedirect } from '@/lib/seo';
import { createRedirectAction, deleteRedirectAction, updateRedirectAction, type RedirectFormState } from './actions';

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

/** 新建重定向弹窗 */
export function CreateRedirectModal() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<RedirectFormState>({ ok: false });
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const result = await createRedirectAction({ ok: false }, formData);
    setSaving(false);
    setState(result);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>新建重定向</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建重定向"
        description="用于 URL 迁移。默认 301（永久）；临时调整用 302。后端会拒绝自指向与成环配置。"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Source URL（站内路径）" htmlFor="sourcePath">
            <input
              id="sourcePath"
              name="sourcePath"
              required
              placeholder="/old-product-page"
              className={inputClass}
            />
          </FormField>
          <FormField label="Target URL" htmlFor="targetPath">
            <input
              id="targetPath"
              name="targetPath"
              required
              placeholder="/products/new-product 或 https://…"
              className={inputClass}
            />
          </FormField>
          <FormField label="Status Code" htmlFor="statusCode">
            <select id="statusCode" name="statusCode" defaultValue="301" className={inputClass}>
              <option value="301">301（永久移动，推荐）</option>
              <option value="302">302（临时移动）</option>
            </select>
          </FormField>
          <FormField label="备注（可选）" htmlFor="note">
            <input id="note" name="note" placeholder="如：2026-10 URL 结构调整" className={inputClass} />
          </FormField>
          {!state.ok && state.error ? <p className="text-small text-red-700">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '创建中…' : '创建'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** 编辑 / 停用重定向弹窗 */
export function EditRedirectModal({ redirect }: { redirect: SeoRedirect }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<RedirectFormState>({ ok: false });
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateRedirectAction(redirect.id, { ok: false }, formData);
    setSaving(false);
    setState(result);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        编辑
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="编辑重定向"
        description="修改目标 / 状态码 / 启用状态。保存后前台 middleware 即时生效（最长 60 秒缓存）。"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Source URL（不可修改）" htmlFor="sourcePath">
            <input id="sourcePath" name="sourcePath" value={redirect.sourcePath} readOnly className={inputClass} />
          </FormField>
          <FormField label="Target URL" htmlFor="targetPath">
            <input
              id="targetPath"
              name="targetPath"
              required
              defaultValue={redirect.targetPath}
              className={inputClass}
            />
          </FormField>
          <FormField label="Status Code" htmlFor="statusCode">
            <select
              id="statusCode"
              name="statusCode"
              defaultValue={String(redirect.statusCode)}
              className={inputClass}
            >
              <option value="301">301（永久移动）</option>
              <option value="302">302（临时移动）</option>
            </select>
          </FormField>
          <FormField label="启用" htmlFor="isActive">
            <label className="flex items-center gap-2 text-small text-foreground">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={redirect.isActive}
                className="size-4 rounded border-border"
              />
              停用后该规则不再生效（不删除，便于恢复）
            </label>
          </FormField>
          <FormField label="备注" htmlFor="note">
            <input id="note" name="note" defaultValue={redirect.note ?? ''} className={inputClass} />
          </FormField>
          {!state.ok && state.error ? <p className="text-small text-red-700">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** 删除重定向（两步确认） */
export function DeleteRedirectButton({ redirect }: { redirect: SeoRedirect }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteRedirectAction(redirect.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error ?? '删除失败');
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        删除
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
        {deleting ? '删除中…' : '确认删除'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        取消
      </Button>
      {error ? <span className="text-caption text-red-700">{error}</span> : null}
    </span>
  );
}
