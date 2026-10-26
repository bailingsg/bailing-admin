import { getMedia } from './media';
import { getProduct, type CmsProductDetail } from './products';
import type { BlogCoverMediaRef, BlogPostDetail } from './blog';
import {
  FACTORY_SECTION_TYPE_LABELS,
  QUALITY_RECORD_TYPE_LABELS,
  type ApplicationDetail,
  type ApplicationProductRef,
  type EnterpriseMediaRef,
  type FactoryExhibition,
  type FactoryImage,
  type FactorySectionDetail,
  type FactorySectionType,
  type QualityRecordDetail,
  type QualityRecordType,
} from './enterprise';

/**
 * 编辑稿（content_drafts.payload）→ 表单初始值。
 *
 * ## 为什么需要这一层
 *
 * 发布工作流的不变量是：**实体行永远保存线上版本**，已发布实体的普通保存
 * 只写 `content_drafts.payload`，不碰实体行（见后端 publishing.engine.ts）。
 * 因此编辑页若只用实体行初始化表单，会出现两个后果：
 *
 *   1. 重新打开编辑页看不到自己未发布的修改（编辑稿"隐身"）；
 *   2. 用户只是点一次「保存」，表单就以**线上旧值**整体覆盖编辑稿
 *      ——未发布的修改被静默丢弃（BUG-03）。
 *
 * 所以编辑页必须用「实体行 + 最新编辑稿」初始化：草稿里出现过的字段以草稿为准，
 * 没出现过的字段保留线上值。
 *
 * ## 三条规则
 *
 * · **白名单**：只接受各模块 Update DTO 声明过的键，草稿里的历史脏键不会进表单；
 * · **null 语义**：草稿显式写 `null` 表示"用户清空了该字段"，覆盖为 null；
 *   键不存在才表示"未提供，保持线上值"；
 * · **关联补齐**：草稿里只有 `xxxId`，而表单需要完整对象（封面 url、图库 url、
 *   关联产品名称），因此按 id 回查媒体库 / 产品；回查失败时保留 id（避免保存时
 *   被清空），仅降级展示。
 */

type Draft = Record<string, unknown> | null | undefined;

/** 草稿中是否存在该键（值为 undefined 视为不存在，与 JSON 序列化一致） */
function has(draft: Draft, key: string): boolean {
  if (!draft) return false;
  if (!Object.prototype.hasOwnProperty.call(draft, key)) return false;
  return draft[key] !== undefined;
}

/** 取字符串；null / 非字符串 → null（= 清空） */
function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** 取字符串数组；非数组 → null */
function textList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === 'string');
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 取规格参数对象；null → null（清空）；数组/标量 → null（草稿不合法） */
function recordOr(value: unknown): Record<string, string> | null {
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    typeof item === 'string' ? item : String(item),
  ]);
  return Object.fromEntries(entries) as Record<string, string>;
}

/** 枚举值合法性（草稿里出现非法枚举时保持线上值，避免 select 回落到第一项） */
function enumOr<T extends string>(value: unknown, labels: Record<T, string>, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  return Object.prototype.hasOwnProperty.call(labels, value) ? (value as T) : fallback;
}

/**
 * 按 id 批量回查媒体库。
 *
 * 失败（媒体已删除 / 无权限 / 后端不可达）时给一个"仅保留 id"的占位对象：
 * 表单仍会把 id 提交回去，不会因为一次读取失败就丢掉草稿里的封面/配图。
 */
async function mediaRefs(
  token: string | null,
  ids: string[],
): Promise<Map<string, EnterpriseMediaRef>> {
  const unique = Array.from(new Set(ids.filter((id) => id.length > 0)));
  const map = new Map<string, EnterpriseMediaRef>();
  if (unique.length === 0) return map;

  const results = await Promise.all(unique.map((id) => getMedia(token, id)));
  results.forEach((result, index) => {
    const id = unique[index]!;
    if (result.ok) {
      const asset = result.data;
      map.set(id, {
        id: asset.id,
        url: asset.url,
        altText: asset.altText,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        originalName: asset.originalName,
      });
      return;
    }
    map.set(id, { id, url: '', altText: null, width: null, height: null, mimeType: '' });
  });
  return map;
}

/** 媒体引用 → 博客封面的精简形状（BlogCoverMediaRef 不含 mimeType） */
function toBlogCover(ref: EnterpriseMediaRef | null): BlogCoverMediaRef | null {
  if (!ref) return null;
  return { id: ref.id, url: ref.url, altText: ref.altText, width: ref.width, height: ref.height };
}

/**
 * 封面合并（应用场景 / 工厂 / 质量 / 博客共用）。
 * 返回 id 与解析出的对象；id 为空表示用户清空了封面。
 */
async function mergeCover(
  token: string | null,
  draft: Draft,
  key: 'coverMediaId' | 'mediaId',
  currentId: string | null,
  currentRef: EnterpriseMediaRef | null,
): Promise<{ id: string | null; ref: EnterpriseMediaRef | null } | null> {
  if (!has(draft, key)) return null;
  const id = text(draft![key]);
  if (!id) return { id: null, ref: null };
  if (currentId === id && currentRef) return { id, ref: currentRef };
  const map = await mediaRefs(token, [id]);
  return { id, ref: map.get(id) ?? null };
}

/* ============================== 产品 ============================== */

/**
 * 产品编辑稿合并。
 * 产品草稿里的字段与表单字段一一对应（无关联 id），因此只需覆盖；
 * 图片（product_images）不进草稿，由图片管理区独立维护。
 */
export function mergeProductDraft(
  product: CmsProductDetail,
  draft: Draft,
): CmsProductDetail {
  if (!draft) return product;
  const merged: CmsProductDetail = { ...product };

  if (has(draft, 'name')) merged.name = text(draft.name) ?? product.name;
  if (has(draft, 'slug')) merged.slug = text(draft.slug) ?? product.slug;
  if (has(draft, 'categoryId')) merged.categoryId = text(draft.categoryId);
  if (has(draft, 'shortDescription')) merged.shortDescription = text(draft.shortDescription);
  if (has(draft, 'description')) merged.description = text(draft.description) ?? '';
  if (has(draft, 'material')) merged.material = text(draft.material);
  if (has(draft, 'applications')) merged.applications = textList(draft.applications) ?? [];
  if (has(draft, 'specifications')) merged.specifications = recordOr(draft.specifications);
  if (has(draft, 'isFeatured')) merged.isFeatured = boolOr(draft.isFeatured, product.isFeatured);
  if (has(draft, 'seoTitle')) merged.seoTitle = text(draft.seoTitle);
  if (has(draft, 'seoDescription')) merged.seoDescription = text(draft.seoDescription);

  return merged;
}

/* ============================== 博客文章 ============================== */

/** 博客编辑稿合并（含封面回查；标签 / 关联产品的名称由页面已有的列表数据解析） */
export async function mergeBlogPostDraft(
  post: BlogPostDetail,
  draft: Draft,
  token: string | null,
): Promise<BlogPostDetail> {
  if (!draft) return post;
  const merged: BlogPostDetail = { ...post };

  if (has(draft, 'title')) merged.title = text(draft.title) ?? post.title;
  if (has(draft, 'slug')) merged.slug = text(draft.slug) ?? post.slug;
  if (has(draft, 'excerpt')) merged.excerpt = text(draft.excerpt);
  if (has(draft, 'content')) merged.content = text(draft.content) ?? post.content;
  if (has(draft, 'categoryId')) merged.categoryId = text(draft.categoryId);
  if (has(draft, 'tagIds')) merged.tagIds = textList(draft.tagIds) ?? [];
  if (has(draft, 'relatedProductIds')) {
    merged.relatedProductIds = textList(draft.relatedProductIds) ?? [];
  }
  if (has(draft, 'featured')) merged.featured = boolOr(draft.featured, post.featured);
  if (has(draft, 'seoTitle')) merged.seoTitle = text(draft.seoTitle);
  if (has(draft, 'seoDescription')) merged.seoDescription = text(draft.seoDescription);
  if (has(draft, 'seoKeywords')) merged.seoKeywords = text(draft.seoKeywords);
  if (has(draft, 'canonicalUrl')) merged.canonicalUrl = text(draft.canonicalUrl);
  if (has(draft, 'ogTitle')) merged.ogTitle = text(draft.ogTitle);
  if (has(draft, 'ogDescription')) merged.ogDescription = text(draft.ogDescription);
  if (has(draft, 'ogImage')) merged.ogImage = text(draft.ogImage);
  if (has(draft, 'twitterTitle')) merged.twitterTitle = text(draft.twitterTitle);
  if (has(draft, 'twitterDescription')) {
    merged.twitterDescription = text(draft.twitterDescription);
  }

  const cover = await mergeCover(
    token,
    draft,
    'coverMediaId',
    post.coverMediaId,
    post.coverMedia
      ? {
          id: post.coverMedia.id,
          url: post.coverMedia.url,
          altText: post.coverMedia.altText,
          width: post.coverMedia.width,
          height: post.coverMedia.height,
          mimeType: '',
        }
      : null,
  );
  if (cover) {
    merged.coverMediaId = cover.id;
    merged.coverMedia = toBlogCover(cover.ref);
    merged.coverImageUrl = cover.ref?.url || null;
  }

  return merged;
}

/* ============================== 应用场景 ============================== */

/** 关联产品：草稿只有 productId + sortOrder，表单要显示名称 → 缺的按 id 回查 */
async function fetchProductRefs(
  token: string | null,
  ids: string[],
): Promise<Map<string, { name: string; slug: string; status: string }>> {
  const map = new Map<string, { name: string; slug: string; status: string }>();
  if (ids.length === 0) return map;
  const results = await Promise.all(ids.map((id) => getProduct(token, id)));
  results.forEach((result, index) => {
    if (!result.ok) return;
    map.set(ids[index]!, {
      name: result.data.name,
      slug: result.data.slug,
      status: result.data.status,
    });
  });
  return map;
}

/** 应用场景编辑稿合并（封面 + 关联产品） */
export async function mergeApplicationDraft(
  application: ApplicationDetail,
  draft: Draft,
  token: string | null,
): Promise<ApplicationDetail> {
  if (!draft) return application;
  const merged: ApplicationDetail = { ...application };

  if (has(draft, 'name')) merged.name = text(draft.name) ?? application.name;
  if (has(draft, 'slug')) merged.slug = text(draft.slug) ?? application.slug;
  if (has(draft, 'summary')) merged.summary = text(draft.summary);
  if (has(draft, 'description')) merged.description = text(draft.description);
  if (has(draft, 'featured')) merged.featured = boolOr(draft.featured, application.featured);
  if (has(draft, 'sortOrder')) merged.sortOrder = numOr(draft.sortOrder, application.sortOrder);
  if (has(draft, 'seoTitle')) merged.seoTitle = text(draft.seoTitle);
  if (has(draft, 'seoDescription')) merged.seoDescription = text(draft.seoDescription);

  const cover = await mergeCover(
    token,
    draft,
    'coverMediaId',
    application.coverMediaId,
    application.coverMedia,
  );
  if (cover) {
    merged.coverMediaId = cover.id;
    merged.coverMedia = cover.ref;
    merged.coverImageUrl = cover.ref?.url || null;
  }

  if (has(draft, 'products')) {
    const raw = Array.isArray(draft.products) ? draft.products : [];
    const ordered = raw
      .map((item, index) => {
        if (item === null || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const productId = text(record.productId);
        if (!productId) return null;
        return { productId, sortOrder: numOr(record.sortOrder, index) };
      })
      .filter((item): item is { productId: string; sortOrder: number } => item !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const known = new Map(application.products.map((item) => [item.id, item]));
    const missing = ordered.map((item) => item.productId).filter((id) => !known.has(id));
    const fetched = await fetchProductRefs(token, Array.from(new Set(missing)));

    merged.products = ordered.map((item): ApplicationProductRef => {
      const existing = known.get(item.productId);
      if (existing) return { ...existing, sortOrder: item.sortOrder };
      const ref = fetched.get(item.productId);
      return {
        id: item.productId,
        name: ref?.name ?? '（产品不可用）',
        slug: ref?.slug ?? '',
        status: ref?.status ?? 'DRAFT',
        sortOrder: item.sortOrder,
      };
    });
    merged.productCount = merged.products.length;
  }

  return merged;
}

/* ============================== 工厂分区 ============================== */

interface DraftImage {
  mediaId: string;
  altText: string | null;
  sortOrder: number;
}

/** 规整草稿里的图片数组（图库 / 展会照片共用） */
function draftImages(value: unknown): DraftImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (item === null || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const mediaId = text(record.mediaId);
      if (!mediaId) return null;
      return {
        mediaId,
        altText: text(record.altText),
        sortOrder: numOr(record.sortOrder, index),
      };
    })
    .filter((item): item is DraftImage => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

interface DraftExhibition {
  id: string | null;
  name: string;
  heldOn: string | null;
  location: string | null;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  photos: DraftImage[];
}

function draftExhibitions(value: unknown): DraftExhibition[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (item === null || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const name = text(record.name);
      if (!name) return null;
      return {
        id: text(record.id),
        name,
        heldOn: text(record.heldOn),
        location: text(record.location),
        description: text(record.description),
        sortOrder: numOr(record.sortOrder, index),
        isVisible: boolOr(record.isVisible, true),
        photos: draftImages(record.photos),
      };
    })
    .filter((item): item is DraftExhibition => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 工厂分区编辑稿合并（封面 + 图库 + 展会记录及其照片） */
export async function mergeFactorySectionDraft(
  section: FactorySectionDetail,
  draft: Draft,
  token: string | null,
): Promise<FactorySectionDetail> {
  if (!draft) return section;
  const merged: FactorySectionDetail = { ...section };

  if (has(draft, 'title')) merged.title = text(draft.title) ?? section.title;
  if (has(draft, 'slug')) merged.slug = text(draft.slug) ?? section.slug;
  if (has(draft, 'sectionType')) {
    merged.sectionType = enumOr<FactorySectionType>(
      draft.sectionType,
      FACTORY_SECTION_TYPE_LABELS,
      section.sectionType,
    );
  }
  if (has(draft, 'summary')) merged.summary = text(draft.summary);
  if (has(draft, 'content')) merged.content = text(draft.content);
  if (has(draft, 'sortOrder')) merged.sortOrder = numOr(draft.sortOrder, section.sortOrder);
  if (has(draft, 'seoTitle')) merged.seoTitle = text(draft.seoTitle);
  if (has(draft, 'seoDescription')) merged.seoDescription = text(draft.seoDescription);

  const cover = await mergeCover(
    token,
    draft,
    'coverMediaId',
    section.coverMediaId,
    section.coverMedia,
  );
  if (cover) {
    merged.coverMediaId = cover.id;
    merged.coverMedia = cover.ref;
    merged.coverImageUrl = cover.ref?.url || null;
  }

  const exhibitions = has(draft, 'exhibitions') ? draftExhibitions(draft.exhibitions) : null;

  if (has(draft, 'images') || exhibitions) {
    const gallery = has(draft, 'images') ? draftImages(draft.images) : null;
    const photoIds = (exhibitions ?? []).flatMap((item) => item.photos.map((photo) => photo.mediaId));
    const ids = [...(gallery ?? []).map((item) => item.mediaId), ...photoIds];
    const refs = await mediaRefs(token, ids);

    if (gallery) {
      merged.images = gallery.map(
        (item, index): FactoryImage => ({
          // 草稿里图库是"整体替换"语义，没有数据库 id；这里给出稳定 key 供渲染
          id: `draft-image-${index}`,
          mediaId: item.mediaId,
          altText: item.altText,
          sortOrder: item.sortOrder,
          exhibitionId: null,
          media: refs.get(item.mediaId) ?? null,
        }),
      );
      merged.imageCount = merged.images.length;
    }

    if (exhibitions) {
      merged.exhibitions = exhibitions.map(
        (item, index): FactoryExhibition => ({
          id: item.id ?? `draft-exhibition-${index}`,
          sectionId: section.id,
          name: item.name,
          heldOn: item.heldOn,
          location: item.location,
          description: item.description,
          sortOrder: item.sortOrder,
          isVisible: item.isVisible,
          photoCount: item.photos.length,
          photos: item.photos.map(
            (photo, photoIndex): FactoryImage => ({
              id: `draft-photo-${index}-${photoIndex}`,
              mediaId: photo.mediaId,
              altText: photo.altText,
              sortOrder: photo.sortOrder,
              exhibitionId: item.id,
              media: refs.get(photo.mediaId) ?? null,
            }),
          ),
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
        }),
      );
      merged.exhibitionCount = merged.exhibitions.length;
    }
  }

  return merged;
}

/* ============================== 质量记录 ============================== */

/** 质量记录编辑稿合并（证书 / 报告文件 + 日期） */
export async function mergeQualityRecordDraft(
  record: QualityRecordDetail,
  draft: Draft,
  token: string | null,
): Promise<QualityRecordDetail> {
  if (!draft) return record;
  const merged: QualityRecordDetail = { ...record };

  if (has(draft, 'title')) merged.title = text(draft.title) ?? record.title;
  if (has(draft, 'slug')) merged.slug = text(draft.slug) ?? record.slug;
  if (has(draft, 'recordType')) {
    merged.recordType = enumOr<QualityRecordType>(
      draft.recordType,
      QUALITY_RECORD_TYPE_LABELS,
      record.recordType,
    );
  }
  if (has(draft, 'issuer')) merged.issuer = text(draft.issuer);
  if (has(draft, 'certificateNumber')) merged.certificateNumber = text(draft.certificateNumber);
  if (has(draft, 'issueDate')) merged.issueDate = text(draft.issueDate);
  if (has(draft, 'expiryDate')) merged.expiryDate = text(draft.expiryDate);
  if (has(draft, 'description')) merged.description = text(draft.description);
  if (has(draft, 'sortOrder')) merged.sortOrder = numOr(draft.sortOrder, record.sortOrder);
  if (has(draft, 'seoTitle')) merged.seoTitle = text(draft.seoTitle);
  if (has(draft, 'seoDescription')) merged.seoDescription = text(draft.seoDescription);

  const file = await mergeCover(token, draft, 'mediaId', record.mediaId, record.media);
  if (file) {
    merged.mediaId = file.id;
    merged.media = file.ref;
  }

  return merged;
}
