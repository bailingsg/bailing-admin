'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PUBLISHABLE_LABELS,
  type PublishableKind,
} from '@/lib/publishing';
import { publishContentAction, unpublishContentAction } from './publishing-actions';

/**
 * 发布控制面板（Phase 1）。
 *
 * 设计要点：
 *   · 状态只读展示，**没有**状态下拉——发布态只能经「发布 / 取消发布」按钮变更
 *   · 三个状态语义明确：草稿（从未上线）/ 已发布（线上可见）/ 已下架（保留内容与历史）
 *   · 有未发布修改时显式提示「线上仍是旧版本」，避免误以为已生效
 *   · 权限不足时按钮禁用并说明原因（后端仍会二次校验）
 *   · 失败时保留当前版本，只展示错误，不刷新页面数据
 */
export interface PublishControlsProps {
  kind: PublishableKind;
  id: string;
  status: string;
  publishedVersion: number;
  hasUnpublishedChanges: boolean;
  /** 发布后需要失效的后台路径 */
  revalidatePaths: string[];
  canPublish: boolean;
  canUnpublish: boolean;
  /** 前台预览地址（可选）：已发布时可直接打开公开页 */
  publicHref?: string;
  /** 后台预览地址（可选）：查看线上版本 + 编辑稿 */
  previewHref?: string;
}

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
  PUBLISHED: { label: '已发布', variant: 'success' },
  DRAFT: { label: '草稿（未上线）', variant: 'muted' },
  UNPUBLISHED: { label: '已下架', variant: 'warning' },
  ARCHIVED: { label: '已下架', variant: 'warning' },
};

export function PublishControls({
  kind,
  id,
  status,
  publishedVersion,
  hasUnpublishedChanges,
  revalidatePaths,
  canPublish,
  canUnpublish,
  publicHref,
  previewHref,
}: PublishControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const meta = STATUS_META[status] ?? { label: status, variant: 'muted' as const };
  const isPublished = status === 'PUBLISHED';
  const label = PUBLISHABLE_LABELS[kind];

  function run(action: 'publish' | 'unpublish') {
    setError(null);
    startTransition(async () => {
      const result =
        action === 'publish'
          ? await publishContentAction(kind, id, revalidatePaths)
          : await unpublishContentAction(kind, id, revalidatePaths);

      if (!result.ok) {
        // 发布失败时线上版本保持不变（后端事务回滚），这里只提示错误
        setError(result.error ?? `${action === 'publish' ? '发布' : '取消发布'}失败`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>发布</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {publishedVersion > 0 ? (
            <span className="text-caption text-text-secondary">线上版本 v{publishedVersion}</span>
          ) : null}
          {hasUnpublishedChanges ? (
            <Badge variant="warning">有未发布的修改</Badge>
          ) : null}
        </div>

        <p className="text-caption text-text-secondary">
          {hasUnpublishedChanges
            ? '保存只更新编辑稿，公开站仍是上一个已发布版本。确认无误后点「发布」才会生效。'
            : isPublished
              ? '当前线上内容与编辑内容一致。'
              : `该${label}尚未上线，公开站不可见。`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {canPublish ? (
            <Button
              type="button"
              size="sm"
              onClick={() => run('publish')}
              disabled={pending}
            >
              {pending ? '处理中…' : isPublished ? '重新发布' : '发布'}
            </Button>
          ) : (
            <span className="text-caption text-text-secondary">无发布权限，请联系管理员授予。</span>
          )}

          {canUnpublish && isPublished ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => run('unpublish')}
              disabled={pending}
            >
              取消发布
            </Button>
          ) : null}

          {previewHref ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={previewHref}>预览（含编辑稿）</Link>
            </Button>
          ) : null}

          {isPublished && publicHref ? (
            <Button asChild size="sm" variant="ghost">
              <a href={publicHref} target="_blank" rel="noopener noreferrer">
                查看线上页面
              </a>
            </Button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
