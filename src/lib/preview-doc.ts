import {
  FACTORY_SECTION_TYPE_LABELS,
  QUALITY_RECORD_TYPE_LABELS,
} from './enterprise';
import { formatDateTime } from './format';
import type { PublishableKind } from './publishing';

/**
 * 内容预览的「可读视图模型」（Phase 1.1）。
 *
 * ## 为什么需要这一层
 *
 * 预览页最初直接把后端 DTO `JSON.stringify` 进 `<pre>`，结果是**不可读**的：
 * 富文本正文是一坨转义后的 HTML、SEO 字段与关联 id 混在一起、封面图看不到。
 * 预览的价值在于「发布前肉眼核对线上/编辑稿的差异」，所以这里把六类实体的
 * DTO 归一成同一个可读结构（标题 + 副标题 + 封面 + 字段列表），由渲染层
 * 按字段类型统一呈现。
 *
 * ## 差异比对也改在这一层
 *
 * 旧实现比对的是**原始 DTO 键**：线上是 `coverMedia`、编辑稿是 `coverMediaId`，
 * 字段名天然不同 → 每次都会把一堆「等价字段」误报成差异（页面只好加注释免责）。
 * 现在两侧都先归一成 PreviewDoc，再按 `key` 比对**归一化后的值**，
 * 因此「封面换了一张图」「正文改了一句话」都能精确命中，不再有假阳性。
 */

export type PreviewFieldKind =
  | 'text'
  | 'longtext'
  | 'richtext'
  | 'image'
  | 'images'
  | 'list'
  | 'kv'
  | 'file';

/** 文档类媒体（PDF 证书 / 报告） */
export interface PreviewFileRef {
  url: string;
  name: string;
}

export type PreviewFieldValue =
  | string
  | string[]
  | Record<string, string>
  | PreviewFileRef
  | null;

export interface PreviewField {
  /** 稳定标识：两侧同名同义，用于差异比对 */
  key: string;
  label: string;
  kind: PreviewFieldKind;
  value: PreviewFieldValue;
}

export interface PreviewDoc {
  title: string;
  subtitle: string | null;
  cover: { url: string; alt: string | null } | null;
  fields: PreviewField[];
}

type Data = Record<string, unknown>;

/* ------------------------------ 取值助手 ------------------------------ */

/** 非空字符串 → 原值；其余（含空串）→ null */
function s(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** ISO 时间 → 本地化字符串（空值 → null） */
function dt(value: unknown): string | null {
  const raw = s(value);
  return raw ? formatDateTime(raw) : null;
}

/** 取媒体对象的 url（无则 null） */
function mediaUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  return s((value as { url?: unknown }).url);
}

/** 取媒体对象的 altText（无则 null） */
function mediaAlt(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  return s((value as { altText?: unknown }).altText);
}

/** 封面：优先 coverImageUrl 快照，回落到 coverMedia.url */
function coverOf(data: Data, mediaKey = 'coverMedia'): PreviewDoc['cover'] {
  const url = s(data.coverImageUrl) ?? mediaUrl(data[mediaKey]);
  return url ? { url, alt: mediaAlt(data[mediaKey]) } : null;
}

/** 对象数组 → 取某个字符串字段并去空 */
function pickList(value: unknown, key: string): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      item && typeof item === 'object' ? s((item as Record<string, unknown>)[key]) : null,
    )
    .filter((item): item is string => item !== null);
}

/** 纯字符串数组 → 去空（产品应用场景等） */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

/** 关联对象 → 取显示名（如 author.name） */
function refName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  return s((value as Record<string, unknown>).name);
}

/** 对象数组 → 取嵌套媒体 url 列表（工厂图库 / 展会照片） */
function mediaUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      return mediaUrl((item as Record<string, unknown>).media);
    })
    .filter((url): url is string => url !== null);
}

/** 规格参数 / 统计数字：Record<string,string>，空对象 → null */
function kvOf(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => [k, typeof v === 'string' ? v : String(v)] as const)
    .filter(([, v]) => v !== '');
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** 站点分区 items（{title, description, href}）→ 可读行 */
function itemLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = s(record.title);
      if (!title) return null;
      const description = s(record.description);
      const href = s(record.href);
      return [title, description, href ? `→ ${href}` : null].filter(Boolean).join(' · ');
    })
    .filter((line): line is string => line !== null);
}

/** 展会记录 → 「名称 · 日期 · 地点」 */
function exhibitionLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const name = s(record.name);
      if (!name) return null;
      return [name, s(record.heldOn), s(record.location)].filter(Boolean).join(' · ');
    })
    .filter((line): line is string => line !== null);
}

/** 布尔 → 是 / 否 */
function yesNo(value: unknown): string {
  return value === true ? '是' : '否';
}

/** 站点分区 stats（[{label, value}]）→ 「标签：数值」行 */
function statLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const label = s(record.label);
      const stat = s(record.value);
      if (!label && !stat) return null;
      return `${label ?? '—'}：${stat ?? '—'}`;
    })
    .filter((line): line is string => line !== null);
}

/** 通用 SEO 字段组（产品 / 应用 / 工厂 / 质量共用） */
function seoFields(data: Data): PreviewField[] {
  return [
    { key: 'seoTitle', label: 'SEO 标题', kind: 'text', value: s(data.seoTitle) },
    {
      key: 'seoDescription',
      label: 'SEO 描述',
      kind: 'longtext',
      value: s(data.seoDescription),
    },
  ];
}

/* ------------------------------ 各类型构造 ------------------------------ */

function blogDoc(data: Data): PreviewDoc {
  const category = data.category as { name?: unknown } | null | undefined;
  return {
    title: s(data.title) ?? '（无标题）',
    subtitle: s(data.excerpt),
    cover: coverOf(data),
    fields: [
      { key: 'content', label: '正文', kind: 'richtext', value: s(data.content) },
      { key: 'category', label: '分类', kind: 'text', value: category ? s(category.name) : null },
      { key: 'tags', label: '标签', kind: 'list', value: pickList(data.tags, 'name') },
      {
        key: 'relatedProducts',
        label: '关联产品',
        kind: 'list',
        value: pickList(data.relatedProducts, 'name'),
      },
      { key: 'featured', label: '精选', kind: 'text', value: yesNo(data.featured) },
      { key: 'author', label: '作者', kind: 'text', value: refName(data.author) },
      { key: 'publishedAt', label: '发布时间', kind: 'text', value: dt(data.publishedAt) },
      { key: 'slug', label: 'URL 别名', kind: 'text', value: s(data.slug) },
      { key: 'updatedAt', label: '最后更新', kind: 'text', value: dt(data.updatedAt) },
      ...seoFields(data),
      { key: 'seoKeywords', label: 'SEO 关键词', kind: 'text', value: s(data.seoKeywords) },
      { key: 'canonicalUrl', label: 'Canonical', kind: 'text', value: s(data.canonicalUrl) },
      { key: 'ogTitle', label: 'OG 标题', kind: 'text', value: s(data.ogTitle) },
      { key: 'ogDescription', label: 'OG 描述', kind: 'longtext', value: s(data.ogDescription) },
      { key: 'ogImage', label: 'OG 图片', kind: 'text', value: s(data.ogImage) },
      { key: 'twitterTitle', label: 'Twitter 标题', kind: 'text', value: s(data.twitterTitle) },
      {
        key: 'twitterDescription',
        label: 'Twitter 描述',
        kind: 'longtext',
        value: s(data.twitterDescription),
      },
    ],
  };
}

function productDoc(data: Data): PreviewDoc {
  const images = Array.isArray(data.images)
    ? (data.images as Array<Record<string, unknown>>)
    : [];
  const urls = images
    .map((image) => s(image.url))
    .filter((url): url is string => url !== null);
  const primary = images.find((image) => image.isPrimary === true) ?? images[0];
  const coverUrl = primary ? s(primary.url) : null;

  return {
    title: s(data.name) ?? '（未命名）',
    subtitle: s(data.shortDescription),
    cover: coverUrl ? { url: coverUrl, alt: primary ? s(primary.altText) : null } : null,
    fields: [
      { key: 'description', label: '详细描述', kind: 'richtext', value: s(data.description) },
      { key: 'images', label: `产品图（${urls.length}）`, kind: 'images', value: urls },
      { key: 'material', label: '材质', kind: 'text', value: s(data.material) },
      {
        key: 'applications',
        label: '应用场景',
        kind: 'list',
        value: stringList(data.applications),
      },
      { key: 'specifications', label: '规格参数', kind: 'kv', value: kvOf(data.specifications) },
      { key: 'isFeatured', label: '首页精选', kind: 'text', value: yesNo(data.isFeatured) },
      { key: 'slug', label: 'URL 别名', kind: 'text', value: s(data.slug) },
      { key: 'updatedAt', label: '最后更新', kind: 'text', value: dt(data.updatedAt) },
      ...seoFields(data),
    ],
  };
}

function factoryDoc(data: Data): PreviewDoc {
  const type = s(data.sectionType);
  const typeLabel =
    type && type in FACTORY_SECTION_TYPE_LABELS
      ? FACTORY_SECTION_TYPE_LABELS[type as keyof typeof FACTORY_SECTION_TYPE_LABELS]
      : type;

  return {
    title: s(data.title) ?? '（无标题）',
    subtitle: s(data.summary),
    cover: coverOf(data),
    fields: [
      { key: 'sectionType', label: '分区类型', kind: 'text', value: typeLabel },
      { key: 'content', label: '正文', kind: 'richtext', value: s(data.content) },
      { key: 'images', label: '图库', kind: 'images', value: mediaUrlList(data.images) },
      {
        key: 'exhibitions',
        label: '展会记录',
        kind: 'list',
        value: exhibitionLines(data.exhibitions),
      },
      { key: 'slug', label: 'URL 别名', kind: 'text', value: s(data.slug) },
      { key: 'updatedAt', label: '最后更新', kind: 'text', value: dt(data.updatedAt) },
      ...seoFields(data),
    ],
  };
}

function qualityDoc(data: Data): PreviewDoc {
  const type = s(data.recordType);
  const typeLabel =
    type && type in QUALITY_RECORD_TYPE_LABELS
      ? QUALITY_RECORD_TYPE_LABELS[type as keyof typeof QUALITY_RECORD_TYPE_LABELS]
      : type;
  const media = data.media as Record<string, unknown> | null | undefined;
  const mediaUrlValue = mediaUrl(media);
  // 编辑稿里的媒体是 getMedia 回查结果，不带 isDocument 标记 → 用 mimeType 兜底
  const isDocument =
    media?.isDocument === true ||
    (typeof media?.mimeType === 'string' && media.mimeType === 'application/pdf');
  const mediaName =
    s(media?.originalName) ?? (isDocument ? '证书 / 报告文件' : '证书图片');

  return {
    title: s(data.title) ?? '（无标题）',
    subtitle: null,
    cover: !isDocument && mediaUrlValue ? { url: mediaUrlValue, alt: mediaAlt(media) } : null,
    fields: [
      { key: 'recordType', label: '类型', kind: 'text', value: typeLabel },
      { key: 'issuer', label: '颁发机构', kind: 'text', value: s(data.issuer) },
      { key: 'certificateNumber', label: '证书编号', kind: 'text', value: s(data.certificateNumber) },
      { key: 'issueDate', label: '签发日期', kind: 'text', value: s(data.issueDate) },
      { key: 'expiryDate', label: '到期日期', kind: 'text', value: s(data.expiryDate) },
      { key: 'description', label: '描述', kind: 'longtext', value: s(data.description) },
      {
        key: 'media',
        label: '证书 / 报告文件',
        kind: mediaUrlValue && isDocument ? 'file' : mediaUrlValue ? 'image' : 'text',
        value: mediaUrlValue ? (isDocument ? { url: mediaUrlValue, name: mediaName } : mediaUrlValue) : null,
      },
      { key: 'slug', label: 'URL 别名', kind: 'text', value: s(data.slug) },
      { key: 'updatedAt', label: '最后更新', kind: 'text', value: dt(data.updatedAt) },
      ...seoFields(data),
    ],
  };
}

function applicationDoc(data: Data): PreviewDoc {
  return {
    title: s(data.name) ?? '（未命名）',
    subtitle: s(data.summary),
    cover: coverOf(data),
    fields: [
      { key: 'description', label: '详细描述', kind: 'longtext', value: s(data.description) },
      {
        key: 'products',
        label: '关联产品',
        kind: 'list',
        value: pickList(data.products, 'name'),
      },
      { key: 'featured', label: '精选', kind: 'text', value: yesNo(data.featured) },
      { key: 'slug', label: 'URL 别名', kind: 'text', value: s(data.slug) },
      { key: 'updatedAt', label: '最后更新', kind: 'text', value: dt(data.updatedAt) },
      ...seoFields(data),
    ],
  };
}

const SITE_PAGE_LABELS: Record<string, string> = {
  HOME: '首页',
  ABOUT: '关于我们',
  CONTACT: '联系页',
};

function siteSectionDoc(data: Data): PreviewDoc {
  const page = s(data.page);
  const media = data.media as Record<string, unknown> | null | undefined;
  const mediaUrlValue = mediaUrl(media);

  return {
    title: s(data.title) ?? s(data.sectionKey) ?? '（无标题）',
    subtitle: s(data.subtitle),
    cover: mediaUrlValue ? { url: mediaUrlValue, alt: mediaAlt(media) } : null,
    fields: [
      { key: 'page', label: '所在页面', kind: 'text', value: page ? (SITE_PAGE_LABELS[page] ?? page) : null },
      { key: 'sectionKey', label: '分区标识', kind: 'text', value: s(data.sectionKey) },
      { key: 'eyebrow', label: '眉标（小字）', kind: 'text', value: s(data.eyebrow) },
      { key: 'body', label: '正文', kind: 'longtext', value: s(data.body) },
      { key: 'ctaLabel', label: '按钮文案', kind: 'text', value: s(data.ctaLabel) },
      { key: 'ctaUrl', label: '按钮链接', kind: 'text', value: s(data.ctaUrl) },
      { key: 'items', label: '卡片条目', kind: 'list', value: itemLines(data.items) },
      { key: 'stats', label: '数据统计', kind: 'list', value: statLines(data.stats) },
      { key: 'sortOrder', label: '排序', kind: 'text', value: typeof data.sortOrder === 'number' ? String(data.sortOrder) : null },
      { key: 'updatedAt', label: '最后更新', kind: 'text', value: dt(data.updatedAt) },
    ],
  };
}

/** 按内容类型把后端 DTO 归一成可读视图模型 */
export function buildPreviewDoc(kind: PublishableKind, data: Data): PreviewDoc {
  switch (kind) {
    case 'blog/posts':
      return blogDoc(data);
    case 'products':
      return productDoc(data);
    case 'factory':
      return factoryDoc(data);
    case 'quality':
      return qualityDoc(data);
    case 'applications':
      return applicationDoc(data);
    case 'site/sections':
      return siteSectionDoc(data);
  }
}

/**
 * 比对两份视图模型，返回发生变化的键集合。
 *
 * 键包含 `title` / `subtitle` / `cover` 三个伪键（对应文档头部的三个区域）
 * 以及各字段的 `key`。比较的是**归一化后的值**，因此不会出现
 * 「字段名不同被误判为差异」的假阳性。
 */
export function diffPreviewDocs(a: PreviewDoc, b: PreviewDoc): Set<string> {
  const changed = new Set<string>();

  if (a.title !== b.title) changed.add('title');
  if (a.subtitle !== b.subtitle) changed.add('subtitle');
  if ((a.cover?.url ?? null) !== (b.cover?.url ?? null)) changed.add('cover');

  const right = new Map(b.fields.map((field) => [field.key, field]));
  for (const field of a.fields) {
    const other = right.get(field.key);
    if (!other || JSON.stringify(field.value) !== JSON.stringify(other.value)) {
      changed.add(field.key);
    }
  }
  for (const field of b.fields) {
    if (!a.fields.some((item) => item.key === field.key)) changed.add(field.key);
  }

  return changed;
}

/** 差异键 → 中文标签（用于顶部摘要，按右侧文档的标签兜底） */
export function labelOfKeys(doc: PreviewDoc, keys: Set<string>): string[] {
  const head: Record<string, string> = {
    title: '标题',
    subtitle: '摘要 / 副标题',
    cover: '封面图',
  };
  const labels: string[] = [];
  for (const key of keys) {
    if (head[key]) {
      labels.push(head[key]);
      continue;
    }
    const field = doc.fields.find((item) => item.key === key);
    if (field) labels.push(field.label);
  }
  return labels;
}
