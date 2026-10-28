'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { MediaAsset } from '@/lib/media';
import {
  FACTORY_SECTION_TYPES,
  FACTORY_SECTION_TYPE_LABELS,
  type FactorySectionDetail,
  type FactorySectionType,
} from '@/lib/enterprise';
import { saveFactorySectionAction, type FactoryFormState } from './actions';
import { MediaPickerModal } from './media-picker';
import { useFormToast } from '@/lib/use-form-toast';

/**
 * 工厂分区表单（创建 / 编辑复用，Phase 4.5）。
 *
 * 封面、图库、展会照片全部来自 Phase 4.3 媒体库（本模块不自行上传文件）。
 * 图库与展会以隐藏字段 JSON 提交，与后端整体替换语义一致。
 */

interface GalleryImage {
  mediaId: string;
  url: string;
  altText: string;
}

interface ExhibitionItem {
  id?: string;
  name: string;
  heldOn: string;
  location: string;
  description: string;
  isVisible: boolean;
  photos: GalleryImage[];
}

interface FactoryFormProps {
  /** 编辑模式传入详情；创建模式为 undefined */
  section?: FactorySectionDetail;
}

const INITIAL_STATE: FactoryFormState = { ok: false };

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

const textareaClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

export function FactorySectionForm({ section }: FactoryFormProps) {
  const router = useRouter();
  const isEdit = section !== undefined;

  const boundAction = React.useCallback(
    (state: FactoryFormState, formData: FormData) =>
      saveFactorySectionAction(section?.id ?? null, state, formData),
    [section?.id],
  );
  const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);

  // 保存结果走顶部气泡：保存按钮在页面最底部，顶部内联提示看不见
  useFormToast(state, { successMessage: isEdit ? '工厂实力内容已保存' : '工厂实力内容已创建' });

  React.useEffect(() => {
    if (state.ok && !isEdit && state.savedId) {
      router.push(`/factory/${state.savedId}/edit`);
    }
  }, [state.ok, state.savedId, isEdit, router]);

  const [cover, setCover] = React.useState<GalleryImage | null>(
    section?.coverMedia || section?.coverImageUrl
      ? {
          mediaId: section.coverMediaId ?? '',
          url: section.coverMedia?.url ?? section.coverImageUrl ?? '',
          altText: section.coverMedia?.altText ?? '',
        }
      : null,
  );
  const [gallery, setGallery] = React.useState<GalleryImage[]>(
    (section?.images ?? []).map((image) => ({
      mediaId: image.mediaId,
      url: image.media?.url ?? '',
      altText: image.altText ?? '',
    })),
  );
  const [exhibitions, setExhibitions] = React.useState<ExhibitionItem[]>(
    (section?.exhibitions ?? []).map((exhibition) => ({
      id: exhibition.id,
      name: exhibition.name,
      heldOn: exhibition.heldOn ? exhibition.heldOn.slice(0, 10) : '',
      location: exhibition.location ?? '',
      description: exhibition.description ?? '',
      isVisible: exhibition.isVisible,
      photos: exhibition.photos.map((photo) => ({
        mediaId: photo.mediaId,
        url: photo.media?.url ?? '',
        altText: photo.altText ?? '',
      })),
    })),
  );

  // 选择器状态：{ target } 决定选中后写入哪里
  type PickerTarget =
    | { kind: 'cover' }
    | { kind: 'gallery' }
    | { kind: 'exhibition'; index: number };
  const [pickerTarget, setPickerTarget] = React.useState<PickerTarget | null>(null);

  function handleAssetSelected(asset: MediaAsset) {
    const picked: GalleryImage = {
      mediaId: asset.id,
      url: asset.url,
      altText: asset.altText ?? '',
    };
    if (!pickerTarget) return;
    if (pickerTarget.kind === 'cover') {
      setCover(picked);
    } else if (pickerTarget.kind === 'gallery') {
      setGallery((prev) => [...prev, picked]);
    } else {
      setExhibitions((prev) =>
        prev.map((item, index) =>
          index === pickerTarget.index ? { ...item, photos: [...item.photos, picked] } : item,
        ),
      );
    }
  }

  const imagesJson = JSON.stringify(
    gallery.map((image, index) => ({
      mediaId: image.mediaId,
      altText: image.altText || undefined,
      sortOrder: index,
    })),
  );

  const exhibitionsJson = JSON.stringify(
    exhibitions.map((exhibition, index) => ({
      id: exhibition.id,
      name: exhibition.name,
      heldOn: exhibition.heldOn || undefined,
      location: exhibition.location || undefined,
      description: exhibition.description || undefined,
      sortOrder: index,
      isVisible: exhibition.isVisible,
      photos: exhibition.photos.map((photo, photoIndex) => ({
        mediaId: photo.mediaId,
        altText: photo.altText || undefined,
        sortOrder: photoIndex,
      })),
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* 隐藏字段 */}
      <input type="hidden" name="coverMediaId" value={cover?.mediaId ?? ''} />
      <input type="hidden" name="imagesJson" value={imagesJson} />
      <input type="hidden" name="exhibitionsJson" value={exhibitionsJson} />

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
              defaultValue={section?.title ?? ''}
              placeholder="如：现代化生产车间"
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
              defaultValue={section?.slug ?? ''}
              placeholder="production-workshop"
              className={inputClass}
            />
            <span className="text-caption text-text-muted">公开详情页地址：/factory/&lt;slug&gt;</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sectionType" required>
              内容类型
            </Label>
            <select
              id="sectionType"
              name="sectionType"
              required
              defaultValue={section?.sectionType ?? 'OVERVIEW'}
              className={inputClass}
            >
              {FACTORY_SECTION_TYPES.map((type: FactorySectionType) => (
                <option key={type} value={type}>
                  {FACTORY_SECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="summary">摘要</Label>
            <textarea
              id="summary"
              name="summary"
              rows={2}
              maxLength={500}
              defaultValue={section?.summary ?? ''}
              placeholder="列表页 / 卡片展示的简短介绍"
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="content">正文</Label>
            <textarea
              id="content"
              name="content"
              rows={6}
              maxLength={50000}
              defaultValue={section?.content ?? ''}
              placeholder="支持基础 HTML（保存时自动净化危险标签与属性）"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 封面 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>封面图</CardTitle>
        </CardHeader>
        <CardContent>
          {cover ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化 */}
              <img
                src={cover.url}
                alt="封面预览"
                className="h-24 w-40 rounded-md border border-border object-cover"
              />
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget({ kind: 'cover' })}>
                  更换封面
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setCover(null)}
                >
                  清除封面
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget({ kind: 'cover' })}>
              从媒体库选择封面
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------- 图库 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>图库（{gallery.length} 张）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gallery.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {gallery.map((image, index) => (
                <li
                  key={`${image.mediaId}-${index}`}
                  className="flex flex-col gap-2 rounded-md border border-border p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={`图库 ${index + 1}`}
                    className="h-24 w-full rounded-sm bg-muted object-cover"
                  />
                  <input
                    type="text"
                    value={image.altText}
                    onChange={(event) =>
                      setGallery((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, altText: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="替代文本（SEO）"
                    aria-label={`图库第 ${index + 1} 张的替代文本`}
                    className="h-8 w-full rounded-sm border border-border bg-background px-2 text-caption text-foreground outline-none focus-visible:border-primary"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="上移"
                        disabled={index === 0}
                        onClick={() =>
                          setGallery((prev) => {
                            const next = [...prev];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next;
                          })
                        }
                        className="rounded-sm border border-border px-1.5 py-0.5 text-caption text-text-secondary disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="下移"
                        disabled={index === gallery.length - 1}
                        onClick={() =>
                          setGallery((prev) => {
                            const next = [...prev];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            return next;
                          })
                        }
                        className="rounded-sm border border-border px-1.5 py-0.5 text-caption text-text-secondary disabled:opacity-40"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGallery((prev) => prev.filter((_, i) => i !== index))}
                      className="text-caption text-destructive hover:underline"
                    >
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-text-secondary">暂无图片，点击下方按钮从媒体库添加。</p>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerTarget({ kind: 'gallery' })}
            >
              添加图片
            </Button>
          </div>
          <p className="text-caption text-text-muted">
            移除仅解除关联，媒体库中的文件不会被删除。
          </p>
        </CardContent>
      </Card>

      {/* ---------------------------- 展会记录 ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>展会记录（{exhibitions.length} 项）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {exhibitions.map((exhibition, index) => (
            <div key={exhibition.id ?? index} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-small font-medium text-foreground">展会 #{index + 1}</span>
                <button
                  type="button"
                  onClick={() => setExhibitions((prev) => prev.filter((_, i) => i !== index))}
                  className="text-caption text-destructive hover:underline"
                >
                  删除此展会
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>展会名称</Label>
                  <input
                    type="text"
                    value={exhibition.name}
                    onChange={(event) =>
                      setExhibitions((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                      )
                    }
                    placeholder="如：2026 广州建博会"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>举办日期</Label>
                  <input
                    type="date"
                    value={exhibition.heldOn}
                    onChange={(event) =>
                      setExhibitions((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, heldOn: event.target.value } : item)),
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>地点</Label>
                  <input
                    type="text"
                    value={exhibition.location}
                    onChange={(event) =>
                      setExhibitions((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, location: event.target.value } : item)),
                      )
                    }
                    placeholder="如：广州 · 广交会展馆"
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id={`visible-${index}`}
                    type="checkbox"
                    checked={exhibition.isVisible}
                    onChange={(event) =>
                      setExhibitions((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, isVisible: event.target.checked } : item,
                        ),
                      )
                    }
                    className="size-4 rounded border-border"
                  />
                  <Label htmlFor={`visible-${index}`}>在公开站展示</Label>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>说明</Label>
                  <textarea
                    rows={2}
                    value={exhibition.description}
                    onChange={(event) =>
                      setExhibitions((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, description: event.target.value } : item,
                        ),
                      )
                    }
                    className={textareaClass}
                  />
                </div>
              </div>

              {/* 展会照片 */}
              <div className="flex flex-col gap-2">
                <span className="text-small font-medium text-foreground">
                  展会照片（{exhibition.photos.length} 张）
                </span>
                {exhibition.photos.length > 0 ? (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {exhibition.photos.map((photo, photoIndex) => (
                      <li key={`${photo.mediaId}-${photoIndex}`} className="flex flex-col gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`展会照片 ${photoIndex + 1}`}
                          className="h-16 w-full rounded-sm bg-muted object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExhibitions((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, photos: item.photos.filter((_, pi) => pi !== photoIndex) }
                                  : item,
                              ),
                            )
                          }
                          className="text-caption text-destructive hover:underline"
                        >
                          移除
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerTarget({ kind: 'exhibition', index })}
                  >
                    添加照片
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setExhibitions((prev) => [
                  ...prev,
                  { name: '', heldOn: '', location: '', description: '', isVisible: true, photos: [] },
                ])
              }
            >
              添加展会
            </Button>
          </div>
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
              defaultValue={section?.sortOrder ?? 0}
              className={inputClass}
            />
          </div>
          <p className="text-caption text-text-muted sm:col-span-2">
            发布状态与发布时间由右上角「发布」面板控制：保存只更新编辑稿，公开站仍是上一个已发布版本。
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
              defaultValue={section?.seoTitle ?? ''}
              placeholder="留空则使用分区标题"
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
              defaultValue={section?.seoDescription ?? ''}
              placeholder="留空则使用摘要"
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- 提交 ---------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : isEdit ? '保存修改' : '创建分区'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          取消
        </Button>
      </div>

      <MediaPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleAssetSelected}
        category="IMAGE"
        title="从媒体库选择图片"
      />
    </form>
  );
}
