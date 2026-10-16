'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { updateSeoSettings } from '@/lib/seo';

/**
 * SEO 全局设置 Actions（Phase 5.0，任务书十九~二十节、三十七节）。
 * 保存后前端 seo tag / sitemap / robots 联动刷新。
 */

export interface SettingsFormState {
  ok: boolean;
  error?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** 可空字段：空串 = 清除 */
function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value === '' ? null : value;
}

export async function saveSeoSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const token = await getSessionToken();
  const result = await updateSeoSettings(token, {
    siteName: str(formData, 'siteName'),
    siteTitle: optional(formData, 'siteTitle'),
    siteDescription: optional(formData, 'siteDescription'),
    defaultOgImage: optional(formData, 'defaultOgImage'),
    defaultTwitterImage: optional(formData, 'defaultTwitterImage'),
    canonicalDomain: optional(formData, 'canonicalDomain'),
    pageTitleTemplate: str(formData, 'pageTitleTemplate'),
    productTitleTemplate: str(formData, 'productTitleTemplate'),
    blogTitleTemplate: str(formData, 'blogTitleTemplate'),
    categoryTitleTemplate: str(formData, 'categoryTitleTemplate'),
    companyName: optional(formData, 'companyName'),
    companyLogo: optional(formData, 'companyLogo'),
    companyWebsite: optional(formData, 'companyWebsite'),
    companyEmail: optional(formData, 'companyEmail'),
    companyPhone: optional(formData, 'companyPhone'),
    companyAddress: optional(formData, 'companyAddress'),
    companyCountry: optional(formData, 'companyCountry'),
    linkedin: optional(formData, 'linkedin'),
    facebook: optional(formData, 'facebook'),
    instagram: optional(formData, 'instagram'),
    youtube: optional(formData, 'youtube'),
    whatsapp: optional(formData, 'whatsapp'),
    googleSiteVerification: optional(formData, 'googleSiteVerification'),
    googleAnalyticsId: optional(formData, 'googleAnalyticsId'),
    googleTagManagerId: optional(formData, 'googleTagManagerId'),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath('/seo/settings');
  return { ok: true };
}
