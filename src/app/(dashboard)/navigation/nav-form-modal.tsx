'use client';

import * as React from 'react';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { NAV_LOCATION_LABELS, type NavItem, type NavLocation } from '@/lib/rbac';
import { saveNavItemAction, type NavFormState } from './actions';

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const URL_HINT = '仅站内相对路径（/xxx）、https 外链或 mailto/tel；javascript: / data: / http 一律拒绝';

/** 导航项新建 / 编辑弹窗（Phase 4.7） */
export function NavFormModal({
  mode,
  triggerLabel,
  item,
  defaultLocation = 'HEADER',
}: {
  mode: 'create' | 'edit';
  triggerLabel: string;
  item?: NavItem;
  defaultLocation?: NavLocation;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<NavFormState>({ ok: true });

  function handleSubmit(formData: FormData) {
    setState({ ok: true });
    startTransition(async () => {
      const result = await saveNavItemAction(mode === 'edit' && item ? item.id : null, state, formData);
      setState(result);
      if (result.ok) {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button type="button" variant={mode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? '新建导航项' : `编辑导航项 · ${item?.label ?? ''}`}
        description="链接由后端强制安全校验；提交后前台导航立即生效。"
      >
        <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="位置" htmlFor="nav-location" required>
            <select
              id="nav-location"
              name={mode === 'edit' ? undefined : 'location'}
              defaultValue={item?.location ?? defaultLocation}
              className={inputClass}
              disabled={mode === 'edit'}
            >
              {(['HEADER', 'FOOTER'] as NavLocation[]).map((key) => (
                <option key={key} value={key}>
                  {NAV_LOCATION_LABELS[key]}
                </option>
              ))}
            </select>
            {/* 编辑模式位置只读；disabled 控件不进 FormData，需隐藏域补交 */}
            {mode === 'edit' ? (
              <input type="hidden" name="location" value={item?.location ?? defaultLocation} />
            ) : null}
          </FormField>

          <FormField label="文案" htmlFor="nav-label" required>
            <input
              id="nav-label"
              name="label"
              type="text"
              required
              maxLength={40}
              defaultValue={item?.label ?? ''}
              placeholder="Products"
              className={inputClass}
            />
          </FormField>

          <FormField label="链接" htmlFor="nav-url" required hint={URL_HINT} className="sm:col-span-2">
            <input
              id="nav-url"
              name="url"
              type="text"
              required
              maxLength={300}
              defaultValue={item?.url ?? ''}
              placeholder="/products"
              className={inputClass}
            />
          </FormField>

          <FormField label="排序" htmlFor="nav-sort" hint="数字越小越靠前">
            <input
              id="nav-sort"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={item?.sortOrder ?? 0}
              className={inputClass}
            />
          </FormField>

          <div className="flex flex-col justify-end gap-2">
            {mode === 'edit' ? (
              <label className="flex items-center gap-2 text-small text-foreground">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={item?.isActive ?? true}
                  className="size-4 rounded border-border"
                />
                启用（停用后前台不展示）
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-small text-foreground">
              <input
                type="checkbox"
                name="openInNewTab"
                defaultChecked={item?.openInNewTab ?? false}
                className="size-4 rounded border-border"
              />
              新窗口打开（外链建议开启）
            </label>
          </div>

          {!state.ok && state.error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive sm:col-span-2"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
