'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { publishContentAction, unpublishContentAction } from '../publishing-actions';

/**
 * 站点分区的内联发布操作（Phase 1）。
 *
 * 站点分区没有独立编辑页（编辑在弹窗内完成），因此发布入口放在列表行上。
 * 与 PublishControls 共用同一套服务端 Action 与权限判定：
 *   · 状态只能经「发布 / 取消发布」变更，没有任何状态下拉
 *   · 无权限时不渲染按钮（后端仍会二次校验）
 *   · 失败只提示错误，不改变当前线上版本
 */
export interface SectionPublishActionsProps {
  id: string;
  status: string;
  hasUnpublishedChanges?: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
}

export function SectionPublishActions({
  id,
  status,
  hasUnpublishedChanges = false,
  canPublish,
  canUnpublish,
}: SectionPublishActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const isPublished = status === 'PUBLISHED';

  function run(action: 'publish' | 'unpublish') {
    setError(null);
    startTransition(async () => {
      const result =
        action === 'publish'
          ? await publishContentAction('site/sections', id, ['/site-content'])
          : await unpublishContentAction('site/sections', id, ['/site-content']);

      if (!result.ok) {
        setError(result.error ?? `${action === 'publish' ? '发布' : '取消发布'}失败`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        {canPublish ? (
          <Button type="button" size="sm" variant="outline" onClick={() => run('publish')} disabled={pending}>
            {pending ? '处理中…' : isPublished ? '重新发布' : '发布'}
          </Button>
        ) : null}
        {canUnpublish && isPublished ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => run('unpublish')} disabled={pending}>
            取消发布
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link href={`/preview/site/sections/${id}`}>预览</Link>
        </Button>
      </div>
      {hasUnpublishedChanges ? (
        <span className="text-caption text-warning-600">有未发布的修改</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-caption text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
