'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  publishContent,
  unpublishContent,
  type PublishableKind,
} from '@/lib/publishing';

/**
 * 发布工作流的服务端 Actions（Phase 1）。
 *
 * 与内容编辑 Action 分离：发布是独立动作、独立权限，
 * 不允许「保存表单」顺带把内容推上线。
 */

export interface PublishActionResult {
  ok: boolean;
  error?: string;
}

/** 发布：把编辑稿变成线上版本 */
export async function publishContentAction(
  kind: PublishableKind,
  id: string,
  paths: string[],
): Promise<PublishActionResult> {
  const token = await getSessionToken();
  const result = await publishContent<{ id: string }>(token, kind, id);
  if (!result.ok) return { ok: false, error: result.error };

  for (const path of paths) revalidatePath(path);
  return { ok: true };
}

/** 取消发布：下架但保留内容与历史 */
export async function unpublishContentAction(
  kind: PublishableKind,
  id: string,
  paths: string[],
): Promise<PublishActionResult> {
  const token = await getSessionToken();
  const result = await unpublishContent<{ id: string }>(token, kind, id);
  if (!result.ok) return { ok: false, error: result.error };

  for (const path of paths) revalidatePath(path);
  return { ok: true };
}
