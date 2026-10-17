'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { listMedia, type MediaAsset } from '@/lib/media';
import {
  createSiteSection,
  deleteSiteSection,
  updateSiteSection,
  type CreateSiteSectionInput,
  type SitePageKey,
  type SiteSectionItem,
  type SiteSectionStat,
  type UpdateSiteSectionInput,
} from '@/lib/rbac';

/**
 * 站点内容（首页 / 关于我们 / 联系页结构化分区）服务端 Actions（Phase 4.7）。
 *
 * 令牌只存在于服务端：所有写操作由服务端读取 HttpOnly Cookie 后
 * 转发给后端 /api/v1/cms/site/**（JwtAuthGuard + PermissionsGuard）。
 *
 * 数据诚信：本模块只搬运运营确认过的结构化文案，
 * 不生成任何占位 / 虚构内容；发布校验由后端强制执行（空内容不允许发布）。
 */

export interface SectionFormState {
  ok: boolean;
  error?: string;
  savedId?: string;
}

export interface SimpleFormState {
  ok: boolean;
  error?: string;
}

const SECTION_KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isSitePage(value: string): value is SitePageKey {
  return value === 'HOME' || value === 'ABOUT' || value === 'CONTACT';
}

function num(formData: FormData, key: string): number | undefined {
  const raw = str(formData, key);
  if (raw === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

/** 解析结构化卡片 JSON（[{title, description?, href?}]，最多 8 项） */
function parseItems(raw: string): { ok: true; value: SiteSectionItem[] } | { ok: false; error: string } {
  if (raw === '') return { ok: true, value: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: '卡片数据不是合法的 JSON' };
  }
  if (!Array.isArray(parsed) || parsed.length > 8) {
    return { ok: false, error: '卡片必须是数组且不超过 8 项' };
  }
  const items: SiteSectionItem[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: '卡片条目格式不正确' };
    }
    const row = entry as Record<string, unknown>;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (title === '') {
      return { ok: false, error: '每张卡片都必须有标题' };
    }
    items.push({
      title,
      description: typeof row.description === 'string' && row.description.trim() !== '' ? row.description.trim() : null,
      href: typeof row.href === 'string' && row.href.trim() !== '' ? row.href.trim() : null,
    });
  }
  return { ok: true, value: items };
}

/** 解析结构化统计项 JSON（[{label, value}]，最多 6 项） */
function parseStats(raw: string): { ok: true; value: SiteSectionStat[] } | { ok: false; error: string } {
  if (raw === '') return { ok: true, value: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: '统计项数据不是合法的 JSON' };
  }
  if (!Array.isArray(parsed) || parsed.length > 6) {
    return { ok: false, error: '统计项必须是数组且不超过 6 项' };
  }
  const stats: SiteSectionStat[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: '统计项格式不正确' };
    }
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === 'string' ? row.label.trim() : '';
    const value = typeof row.value === 'string' ? row.value.trim() : '';
    if (label === '' || value === '') {
      return { ok: false, error: '每个统计项都必须有标签与数值' };
    }
    stats.push({ label, value });
  }
  return { ok: true, value: stats };
}

/** 创建 / 更新站点分区（id 为 null 时创建） */
export async function saveSectionAction(
  id: string | null,
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  const token = await getSessionToken();

  const page = str(formData, 'page');
  if (!isSitePage(page)) {
    return { ok: false, error: '请选择合法的页面（首页 / 关于我们 / 联系页）' };
  }

  const sectionKey = str(formData, 'sectionKey').toLowerCase();
  if (!SECTION_KEY_PATTERN.test(sectionKey)) {
    return { ok: false, error: '分区键只能包含小写字母、数字与 . - 分隔（如 home.hero）' };
  }

  const itemsResult = parseItems(str(formData, 'items'));
  if (!itemsResult.ok) return { ok: false, error: itemsResult.error };
  const statsResult = parseStats(str(formData, 'stats'));
  if (!statsResult.ok) return { ok: false, error: statsResult.error };

  // 空串 → undefined（表示不改动）；明确传 '' 的字段在 services 层按空值处理
  const optional = (key: string): string | undefined => {
    const raw = str(formData, key);
    return raw === '' ? undefined : raw;
  };

  const common = {
    page,
    sectionKey,
    eyebrow: optional('eyebrow'),
    title: optional('title'),
    subtitle: optional('subtitle'),
    body: optional('body'),
    mediaId: optional('mediaId'),
    ctaLabel: optional('ctaLabel'),
    ctaUrl: optional('ctaUrl'),
    items: itemsResult.value,
    stats: statsResult.value,
    sortOrder: num(formData, 'sortOrder'),
  } satisfies Omit<CreateSiteSectionInput, 'page' | 'sectionKey'> & {
    page: SitePageKey;
    sectionKey: string;
  };

  if (id === null) {
    const result = await createSiteSection(token, common);
    if (!result.ok) {
      return { ok: false, error: result.error ?? '创建失败' };
    }
    revalidatePath('/site-content');
    return { ok: true, savedId: result.data.id };
  }

  const updateInput: UpdateSiteSectionInput = {
    eyebrow: common.eyebrow,
    title: common.title,
    subtitle: common.subtitle,
    body: common.body,
    mediaId: common.mediaId ?? null,
    ctaLabel: common.ctaLabel,
    ctaUrl: common.ctaUrl,
    items: common.items,
    stats: common.stats,
    sortOrder: common.sortOrder,
  };
  const result = await updateSiteSection(token, id, updateInput);
  if (!result.ok) {
    return { ok: false, error: result.error ?? '保存失败' };
  }
  revalidatePath('/site-content');
  return { ok: true, savedId: result.data.id };
}

/** 删除站点分区（两步确认由 UI 承担） */
export async function deleteSectionAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteSiteSection(token, id);
  if (!result.ok) {
    return { ok: false, error: result.error ?? '删除失败' };
  }
  revalidatePath('/site-content');
  return { ok: true };
}

/* ------------------------------ 媒体选择器 ------------------------------ */

export interface PickerResult {
  ok: boolean;
  items: MediaAsset[];
  total: number;
  totalPages: number;
  error?: string;
}

/** 站点分区配图选择器数据源（只读媒体库图片，不自行上传） */
export async function fetchMediaForSection(
  page = 1,
  keyword = '',
): Promise<PickerResult> {
  const token = await getSessionToken();
  const result = await listMedia(token, {
    page,
    limit: 24,
    keyword: keyword.trim() || undefined,
    category: 'IMAGE',
  });

  if (!result.ok) {
    return { ok: false, items: [], total: 0, totalPages: 0, error: result.error };
  }
  return {
    ok: true,
    items: result.data.items,
    total: result.data.total,
    totalPages: result.data.totalPages,
  };
}
