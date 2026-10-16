'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import {
  quickFixSeoProfile,
  updateSeoProfile,
  type SchemaType,
  type UpdateSeoProfileInput,
} from '@/lib/seo';

/**
 * SEO 档案编辑 Actions（Phase 5.0）。
 *
 * 令牌只存在于服务端：写操作由服务端读取 HttpOnly Cookie 后转发给
 * 后端 /api/v1/cms/seo/profiles/:type/:id（JwtAuthGuard + PermissionsGuard，
 * 需要 seo.manage 权限）。
 */

export interface SeoEditorFormState {
  ok: boolean;
  error?: string;
}

const SCHEMA_TYPES: SchemaType[] = ['NONE', 'WEB_PAGE', 'PRODUCT', 'ARTICLE', 'FAQ_PAGE'];

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** 可选字段：空串 = 清除（后端按 null 处理） */
function optional(formData: FormData, key: string): string {
  return str(formData, key);
}

function parseBool(formData: FormData, key: string): boolean | undefined {
  const value = formData.get(key);
  if (value === null) return undefined;
  return value === 'on' || value === 'true' || value === '1';
}

function parseSchemaType(value: string): SchemaType {
  return (SCHEMA_TYPES as string[]).includes(value) ? (value as SchemaType) : 'NONE';
}

/** 保存 SEO 档案（未填字段 = 不动；空串 = 清除可空字段） */
export async function saveSeoProfileAction(
  entityType: string,
  entityId: string,
  _prevState: SeoEditorFormState,
  formData: FormData,
): Promise<SeoEditorFormState> {
  const token = await getSessionToken();

  const input: UpdateSeoProfileInput = {
    metaTitle: optional(formData, 'metaTitle'),
    metaDescription: optional(formData, 'metaDescription'),
    canonicalUrl: optional(formData, 'canonicalUrl'),
    robotsIndex: parseBool(formData, 'robotsIndex'),
    robotsFollow: parseBool(formData, 'robotsFollow'),
    focusKeyword: optional(formData, 'focusKeyword'),
    keywords: optional(formData, 'keywords'),
    ogTitle: optional(formData, 'ogTitle'),
    ogDescription: optional(formData, 'ogDescription'),
    ogImage: optional(formData, 'ogImage'),
    twitterTitle: optional(formData, 'twitterTitle'),
    twitterDescription: optional(formData, 'twitterDescription'),
    twitterImage: optional(formData, 'twitterImage'),
    schemaType: parseSchemaType(str(formData, 'schemaType')),
    schemaData: optional(formData, 'schemaData'),
    relatedData: optional(formData, 'relatedData'),
  };

  const result = await updateSeoProfile(token, entityType, entityId, input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath(`/seo/${entityType}/${entityId}`);
  return { ok: true };
}

export interface QuickFixFormState {
  ok: boolean;
  error?: string;
  /** 预览 / 应用的字段级 diff */
  applied?: { field: string; before: string | null; after: string }[];
  skipped?: { field: string; reason: string }[];
  mode?: 'preview' | 'apply';
}

/** 快捷修复：先 dryRun 预览 diff，确认后 apply（仅填补空缺，不覆盖已有值） */
export async function quickFixSeoAction(
  entityType: string,
  entityId: string,
  fields: string[],
  dryRun: boolean,
): Promise<QuickFixFormState> {
  const token = await getSessionToken();
  const result = await quickFixSeoProfile(token, entityType, entityId, fields, dryRun);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (!dryRun) {
    revalidatePath(`/seo/${entityType}/${entityId}`);
  }
  return {
    ok: true,
    applied: result.data.applied,
    skipped: result.data.skipped,
    mode: dryRun ? 'preview' : 'apply',
  };
}
