'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { MediaAsset } from '@/lib/media';
import { MediaPickerModal } from './media-picker';

/**
 * 封面选择器（Phase 4.4）。
 *
 * 只维护 coverMediaId（隐藏 input）；封面地址由后端依据媒体资产自动回填
 * coverImageUrl 快照。博客模块**不提供上传入口**——新图片请到「媒体资源」页面。
 */

interface CoverPickerProps {
  /** 编辑模式：已有封面（来自文章详情 coverMedia） */
  initialMedia?: { id: string; url: string; altText: string | null } | null;
}

export function CoverPicker({ initialMedia }: CoverPickerProps) {
  const [media, setMedia] = React.useState<{ id: string; url: string; altText: string | null } | null>(
    initialMedia ?? null,
  );
  const [open, setOpen] = React.useState(false);

  function handleSelect(asset: MediaAsset) {
    setMedia({ id: asset.id, url: asset.url, altText: asset.altText });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="cover-picker-button">封面图</Label>

      {media ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* 后端返回的本地静态资源 URL */}
          {/* eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化 */}
          <img
            src={media.url}
            alt={media.altText ?? '文章封面'}
            className="h-28 w-44 rounded-md border border-border bg-muted object-cover"
          />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              更换封面
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setMedia(null)}
            >
              移除封面
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            id="cover-picker-button"
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setOpen(true)}
          >
            从媒体库选择封面
          </Button>
          <p className="text-caption text-text-muted">
            尚未选择封面。需要新图片请先到「媒体资源」页面上传。
          </p>
        </div>
      )}

      {/* 提交值：媒体资产 ID（空串表示无封面） */}
      <input type="hidden" name="coverMediaId" value={media?.id ?? ''} readOnly />

      <MediaPickerModal open={open} onClose={() => setOpen(false)} onSelect={handleSelect} />
    </div>
  );
}
