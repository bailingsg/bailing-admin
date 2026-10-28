'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { mediaTypeLabel, type MediaAsset } from '@/lib/media';
import {
  QUALITY_RECORD_TYPES,
  QUALITY_RECORD_TYPE_LABELS,
  type QualityRecordDetail,
  type QualityRecordType,
} from '@/lib/enterprise';
import { saveQualityRecordAction, type QualityFormState } from './actions';
import { QualityPickerModal } from './media-picker';
import { useFormToast } from '@/lib/use-form-toast';

/**
 * 质量记录表单（创建 / 编辑复用，Phase 4.5）。
 *
 * 数据诚实：机构 / 证书编号 / 颁发日期 / 到期日期均为可选项——
 * QUALITY_CONTROL 类记录通常没有证书编号与有效期，留空即按 null 保存，
 * 不做任何推断或占位。
 */

interface QualityFormProps {
  record?: QualityRecordDetail;
}

const INITIAL_STATE: QualityFormState = { ok: false };

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const textareaClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

/** ISO → date input 值（YYYY-MM-DD，固定 Asia/Shanghai） */
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(date);
  return formatted;
}

export function QualityRecordForm({ record }: QualityFormProps) {
  const router = useRouter();
  const isEdit = record !== undefined;

  const boundAction = React.useCallback(
    (state: QualityFormState, formData: FormData) =>
      saveQualityRecordAction(record?.id ?? null, state, formData),
    [record?.id],
  );
  const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);

  // 保存结果走顶部气泡：保存按钮在页面最底部，顶部内联提示看不见
  useFormToast(state, { successMessage: isEdit ? '质量体系内容已保存' : '质量体系内容已创建' });

  React.useEffect(() => {
    if (state.ok && !isEdit && state.savedId) {
      router.push(`/quality/${state.savedId}/edit`);
    }
  }, [state.ok, state.savedId, isEdit, router]);

  const [file, setFile] = React.useState<{ mediaId: string; url: string; name: string; mime: string } | null>(
    record?.media
      ? {
          mediaId: record.mediaId ?? '',
          url: record.media.url,
          name: record.media.originalName ?? '已选文件',
          mime: record.media.mimeType,
        }
      : null,
  );
  const [pickerOpen, setPickerOpen] = React.useState(false);

  function handleAssetSelected(asset: MediaAsset) {
    setFile({ mediaId: asset.id, url: asset.url, name: asset.originalName, mime: asset.mimeType });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="mediaId" value={file?.mediaId ?? ''} />

      {/* ---------------------------- 基本信息 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="title" required>
              标题
            </Label>
            <input
              id="title"
              name="title"
              required
              minLength={2}
              maxLength={200}
              defaultValue={record?.title ?? ''}
              placeholder="如：FSC 森林认证"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug" required>
              URL 标识（slug）
            </Label>
            <input
              id="slug"
              name="slug"
              required
              maxLength={200}
              defaultValue={record?.slug ?? ''}
              placeholder="fsc-certification"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recordType" required>
              记录类型
            </Label>
            <select
              id="recordType"
              name="recordType"
              required
              defaultValue={record?.recordType ?? 'CERTIFICATION'}
              className={inputClass}
            >
              {QUALITY_RECORD_TYPES.map((type: QualityRecordType) => (
                <option key={type} value={type}>
                  {QUALITY_RECORD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issuer">认证 / 检测机构</Label>
            <input
              id="issuer"
              name="issuer"
              maxLength={200}
              defaultValue={record?.issuer ?? ''}
              placeholder="如：FSC、SGS、TÜV（可留空）"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="certificateNumber">证书编号</Label>
            <input
              id="certificateNumber"
              name="certificateNumber"
              maxLength={120}
              defaultValue={record?.certificateNumber ?? ''}
              placeholder="无编号的记录留空即可"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issueDate">颁发日期</Label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              defaultValue={toDateInputValue(record?.issueDate)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiryDate">到期日期</Label>
            <input
              id="expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={toDateInputValue(record?.expiryDate)}
              className={inputClass}
            />
            <span className="text-caption text-text-muted">
              留空表示长期有效或不适用，系统不会据此推断任何过期结论。
            </span>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">说明</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={20000}
              defaultValue={record?.description ?? ''}
              placeholder="证书覆盖范围、检测结论等（纯文本展示）"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 证书 / 报告文件 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>证书 / 报告文件</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {file ? (
            <div className="flex flex-wrap items-center gap-4 rounded-md border border-border p-3">
              {file.mime === 'application/pdf' ? (
                <span className="flex h-16 w-24 items-center justify-center rounded-sm bg-muted text-small font-medium text-text-secondary">
                  PDF
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt="证书预览"
                  className="h-16 w-24 rounded-sm border border-border object-cover"
                />
              )}
              <div className="flex flex-col gap-1">
                <span className="text-small text-foreground">{file.name}</span>
                <span className="text-caption text-text-muted">{mediaTypeLabel(file.mime)}</span>
              </div>
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  更换
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setFile(null)}
                >
                  解除关联
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              从媒体库选择文件
            </Button>
          )}
          <p className="text-caption text-text-muted">
            支持 PDF 与图片。解除关联不会删除媒体库中的文件。
          </p>
        </CardContent>
      </Card>

      {/* ---------------------------- 排序 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>排序</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sortOrder">排序（数字越小越靠前）</Label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={record?.sortOrder ?? 0}
              className={inputClass}
            />
          </div>
          <p className="text-caption text-text-muted sm:col-span-2">
            发布状态与发布时间由右上角「发布」面板控制。只有已发布的记录会出现在公开站，保存不会改变线上版本。
          </p>
        </CardContent>
      </Card>

      {/* ---------------------------- SEO ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="seoTitle">SEO 标题</Label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={200}
              defaultValue={record?.seoTitle ?? ''}
              placeholder="留空则使用标题"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="seoDescription">SEO 描述</Label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              maxLength={500}
              defaultValue={record?.seoDescription ?? ''}
              placeholder="留空则使用说明"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : isEdit ? '保存修改' : '创建记录'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          取消
        </Button>
      </div>

      <QualityPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAssetSelected} />
    </form>
  );
}
