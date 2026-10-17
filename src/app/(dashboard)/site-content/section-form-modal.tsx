'use client';

import * as React from 'react';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SectionMediaPicker } from './media-picker';
import {
  SITE_PAGE_LABELS,
  type SitePageKey,
  type SiteSection,
  type SiteSectionItem,
  type SiteSectionStat,
} from '@/lib/rbac';
import { saveSectionAction, type SectionFormState } from './actions';

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';
const textareaClass =
  'min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const ITEMS_HINT =
  'JSON 数组，最多 8 项：[{"title":"卡片标题","description":"描述（可选）","href":"/link（可选）"}]';
const STATS_HINT = 'JSON 数组，最多 6 项：[{"label":"指标名","value":"数值"}]';

function toItemsJson(items: SiteSectionItem[]): string {
  return items.length === 0 ? '' : JSON.stringify(items, null, 2);
}

function toStatsJson(stats: SiteSectionStat[]): string {
  return stats.length === 0 ? '' : JSON.stringify(stats, null, 2);
}

/**
 * 站点分区新建 / 编辑弹窗（Phase 4.7）。
 *
 * 结构化字段录入：眉题 / 标题 / 副标题 / 正文 / CTA / 卡片 / 统计项 / 排序 / 状态。
 * 卡片与统计项以 JSON 文本域录入（前端 + 后端 + 读出层三重白名单校验）。
 */
export function SectionFormModal({
  mode,
  triggerLabel,
  section,
}: {
  mode: 'create' | 'edit';
  triggerLabel: string;
  section?: SiteSection;
}) {
  const [open, setOpen] = React.useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<SectionFormState>({ ok: true });
  const [page, setPage] = React.useState<SitePageKey>(section?.page ?? 'HOME');
  const [mediaId, setMediaId] = React.useState(section?.media?.id ?? '');
  const [mediaPreview, setMediaPreview] = React.useState<{
    url: string;
    altText: string | null;
  } | null>(
    section?.media
      ? { url: section.media.url, altText: section.media.altText }
      : null,
  );

  function handleSubmit(formData: FormData) {
    setState({ ok: true });
    startTransition(async () => {
      const result = await saveSectionAction(mode === 'edit' && section ? section.id : null, state, formData);
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
        title={mode === 'create' ? '新建站点分区' : `编辑分区 · ${section?.sectionKey ?? ''}`}
        description="结构化字段录入；发布由后端校验（空内容不允许发布），草稿与归档不进入公开 API。"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button type="submit" form="section-form" size="sm" disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </div>
        }
      >
        <form
          id="section-form"
          action={handleSubmit}
          className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2"
        >
          <FormField
            label="所属页面"
            htmlFor="section-page"
            required
            hint="分区键在同一页面内唯一"
          >
            <select
              id="section-page"
              name={mode === 'edit' ? undefined : 'page'}
              className={inputClass}
              value={page}
              onChange={(event) => setPage(event.target.value as SitePageKey)}
              disabled={mode === 'edit'}
            >
              {(Object.keys(SITE_PAGE_LABELS) as SitePageKey[]).map((key) => (
                <option key={key} value={key}>
                  {SITE_PAGE_LABELS[key]}
                </option>
              ))}
            </select>
            {/*
              编辑模式下页面不可变更（分区键在同一页面内唯一，迁移等于换一条记录），
              因此选择框 disabled；但 disabled 控件不会进入 FormData，
              必须用隐藏域补交该值，否则服务端校验会因缺字段而拒绝保存。
            */}
            {mode === 'edit' ? <input type="hidden" name="page" value={page} /> : null}
          </FormField>

          <FormField
            label="分区键"
            htmlFor="section-key"
            required
            hint="小写字母 / 数字 / . - 分隔，如 home.hero"
          >
            <input
              id="section-key"
              name={mode === 'edit' ? undefined : 'sectionKey'}
              type="text"
              required
              defaultValue={section?.sectionKey ?? ''}
              placeholder="home.hero"
              className={inputClass}
              disabled={mode === 'edit'}
            />
            {/* 同上：编辑模式分区键只读，值由隐藏域提交 */}
            {mode === 'edit' ? (
              <input type="hidden" name="sectionKey" value={section?.sectionKey ?? ''} />
            ) : null}
          </FormField>

          <FormField label="眉题" htmlFor="section-eyebrow" hint="小节眉题（如 Capabilities）">
            <input
              id="section-eyebrow"
              name="eyebrow"
              type="text"
              defaultValue={section?.eyebrow ?? ''}
              className={inputClass}
            />
          </FormField>

          <FormField label="标题" htmlFor="section-title">
            <input
              id="section-title"
              name="title"
              type="text"
              defaultValue={section?.title ?? ''}
              className={inputClass}
            />
          </FormField>

          <FormField label="副标题" htmlFor="section-subtitle" className="sm:col-span-2">
            <input
              id="section-subtitle"
              name="subtitle"
              type="text"
              defaultValue={section?.subtitle ?? ''}
              className={inputClass}
            />
          </FormField>

          <FormField
            label="正文"
            htmlFor="section-body"
            hint="受限文本；不承载脚本"
            className="sm:col-span-2"
          >
            <textarea
              id="section-body"
              name="body"
              defaultValue={section?.body ?? ''}
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </FormField>

          <FormField label="CTA 文案" htmlFor="section-cta-label">
            <input
              id="section-cta-label"
              name="ctaLabel"
              type="text"
              defaultValue={section?.ctaLabel ?? ''}
              className={inputClass}
            />
          </FormField>

          <FormField
            label="CTA 链接"
            htmlFor="section-cta-url"
            hint="仅站内相对路径（/xxx）或 https 外链"
          >
            <input
              id="section-cta-url"
              name="ctaUrl"
              type="text"
              defaultValue={section?.ctaUrl ?? ''}
              placeholder="/contact#rfq"
              className={inputClass}
            />
          </FormField>

          <FormField
            label="卡片列表"
            htmlFor="section-items"
            hint={ITEMS_HINT}
            className="sm:col-span-2"
          >
            <textarea
              id="section-items"
              name="items"
              defaultValue={toItemsJson(section?.items ?? [])}
              placeholder={ITEMS_HINT}
              className={textareaClass}
            />
          </FormField>

          <FormField
            label="统计项"
            htmlFor="section-stats"
            hint={STATS_HINT}
            className="sm:col-span-2"
          >
            <textarea
              id="section-stats"
              name="stats"
              defaultValue={toStatsJson(section?.stats ?? [])}
              placeholder={STATS_HINT}
              className={textareaClass}
            />
          </FormField>

          <FormField
            label="配图"
            htmlFor="section-media-id"
            hint="从媒体库选择（删除保护：被引用的素材不允许直接删除）"
            className="sm:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-3">
              <input type="hidden" id="section-media-id" name="mediaId" value={mediaId} />
              {mediaPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPreview.url}
                  alt={mediaPreview.altText ?? '分区配图'}
                  className="h-16 w-24 rounded-sm border border-border object-cover"
                />
              ) : (
                <span className="flex h-16 w-24 items-center justify-center rounded-sm bg-muted text-caption text-text-muted">
                  无配图
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaPickerOpen(true)}
              >
                {mediaId ? '更换配图' : '选择配图'}
              </Button>
              {mediaId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // 清空：以空串提交即表示无配图（编辑模式下不发送 mediaId 清空语义，
                    // 因此这里用隐藏字段传空串 + 前端状态同步）
                    setMediaId('');
                    setMediaPreview(null);
                  }}
                >
                  移除
                </Button>
              ) : null}
            </div>
          </FormField>

          <SectionMediaPicker
            open={mediaPickerOpen}
            onClose={() => setMediaPickerOpen(false)}
            onSelect={(asset) => {
              setMediaId(asset.id);
              setMediaPreview({ url: asset.url, altText: asset.altText });
            }}
          />

          <FormField label="排序" htmlFor="section-sort" hint="数字越小越靠前">
            <input
              id="section-sort"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={section?.sortOrder ?? 0}
              className={inputClass}
            />
          </FormField>

          <p className="text-caption text-text-muted sm:col-span-2">
            发布状态与发布时间由列表页的「发布 / 取消发布」按钮控制：保存只更新编辑稿，公开站仍是上一个已发布版本。
          </p>

          {!state.ok && state.error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive sm:col-span-2"
            >
              {state.error}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
