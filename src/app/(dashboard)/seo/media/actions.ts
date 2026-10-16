'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { updateMediaSeo } from '@/lib/media';

/**
 * 媒体 SEO Actions（Phase 5.0，任务书十六节）。
 * 图片 alt / title / caption / description 经后端 PATCH /cms/media/:id 落库
 * （需要 media.update 权限）。
 */

export interface MediaSeoFormState {
  ok: boolean;
  error?: string;
  savedId?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function saveMediaSeoAction(
  id: string,
  _prevState: MediaSeoFormState,
  formData: FormData,
): Promise<MediaSeoFormState> {
  const token = await getSessionToken();
  const result = await updateMediaSeo(token, id, {
    altText: str(formData, 'altText'),
    title: str(formData, 'title'),
    caption: str(formData, 'caption'),
    description: str(formData, 'description'),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath('/seo/media');
  return { ok: true, savedId: id };
}
