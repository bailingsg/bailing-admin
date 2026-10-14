'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { deleteMedia, uploadMediaAsset } from '@/lib/media';

/**
 * 媒体资源库服务端 Actions（Phase 4.3）。
 *
 * 上传直接透传 multipart FormData（含 File 对象）到后端；
 * JWT 只存在于服务端（HttpOnly Cookie），浏览器不接触令牌。
 */

export interface MediaFormState {
  ok: boolean;
  error?: string;
  status?: number;
}

/** 上传媒体（表单 / 拖拽共用：payload 为含 file 字段的 FormData） */
export async function uploadMediaAction(
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return { ok: false, error: '请选择要上传的图片文件', status: 400 };
  }

  const token = await getSessionToken();
  const result = await uploadMediaAsset(token, formData);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  revalidatePath('/media');
  return { ok: true };
}

/** 删除媒体（被产品图片引用时后端返回 400） */
export async function deleteMediaAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const token = await getSessionToken();
  const result = await deleteMedia(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/media');
  return { ok: true };
}
