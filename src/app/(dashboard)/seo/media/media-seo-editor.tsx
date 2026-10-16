'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { MediaAsset } from '@/lib/media';
import { saveMediaSeoAction, type MediaSeoFormState } from './actions';

/**
 * 媒体 SEO 编辑弹窗（alt / title / caption / description）。
 * Alt Text 是 SEO Audit 的硬性检查项，缺失时列表行会标红。
 */
export function MediaSeoEditor({ media }: { media: MediaAsset }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<MediaSeoFormState>({ ok: false });
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const result = await saveMediaSeoAction(media.id, { ok: false }, formData);
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
        编辑 SEO
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="图片 SEO"
        description="Alt 文本用于图片 SEO 与无障碍；标题 / 图注 / 描述用于图库展示与检索。"
      >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormField label="Alt Text（必填，SEO 硬性检查项）" htmlFor="altText">
          <textarea
            id="altText"
            name="altText"
            rows={2}
            defaultValue={media.altText ?? ''}
            placeholder="如 18mm plywood board stack in factory"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </FormField>
        <FormField label="Title" htmlFor="title">
          <input
            id="title"
            name="title"
            defaultValue={media.title ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </FormField>
        <FormField label="Caption（图注）" htmlFor="caption">
          <input
            id="caption"
            name="caption"
            defaultValue={media.caption ?? ''}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </FormField>
        <FormField label="Description" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={media.description ?? ''}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </FormField>
        {!state.ok && state.error ? (
          <p className="text-small text-red-700">{state.error}</p>
        ) : null}
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
