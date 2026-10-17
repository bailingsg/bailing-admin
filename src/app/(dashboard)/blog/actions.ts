'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { listMedia, type MediaAsset } from '@/lib/media';
import {
  createBlogCategory,
  createBlogPost,
  createBlogTag,
  deleteBlogCategory,
  deleteBlogPost,
  deleteBlogTag,
  updateBlogCategory,
  updateBlogPost,
  updateBlogTag,
} from '@/lib/blog';

/**
 * Blog CMS 服务端 Actions（Phase 4.4）。
 *
 * 令牌只存在于服务端：浏览器 JS 永远拿不到 JWT，所有写操作
 * 由服务端读取 HttpOnly Cookie 后转发给后端 /api/v1/cms/blog/**。
 */

export interface BlogFormState {
  ok: boolean;
  error?: string;
  /** 保存成功后的文章 ID（供创建后跳转编辑页） */
  savedId?: string;
}

export interface SimpleFormState {
  ok: boolean;
  error?: string;
}

/** 读取字符串字段并去空白 */
function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** 解析隐藏字段中的 JSON 字符串数组（标签 ID 列表） */
function parseStringArray(raw: string): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== 'string')) {
      return { ok: false, error: '标签数据格式不正确' };
    }
    return { ok: true, value: parsed as string[] };
  } catch {
    return { ok: false, error: '标签数据格式不正确' };
  }
}

/* ============================== 文章 ============================== */

/**
 * 创建 / 更新文章（id 为 null 时创建）。
 * 与 BlogPostForm 客户端组件配合（useActionState）。
 *
 * 说明：表单始终提交全部可空字段——留空即代表「清空该字段」，
 * 服务端据此发送 null（后端 PATCH 的三态语义：缺省=不变、null=清空）。
 *
 * Phase 1：表单**不再提交 status / publishedAt**——发布态只能经
 * 「发布 / 取消发布」动作变更，发布时间由服务端在发布时写入。
 * 已发布文章保存时后端只更新编辑稿，公开站保持上一个已发布版本。
 */
export async function saveBlogPostAction(
  id: string | null,
  _prevState: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  const title = str(formData, 'title');
  const slug = str(formData, 'slug');
  const content = str(formData, 'content');

  if (!title || !slug) return { ok: false, error: '请填写文章标题与 URL 标识（slug）' };
  if (!content || content === '<p></p>' || content === '<br>') {
    return { ok: false, error: '请填写文章正文' };
  }

  const tagIds = parseStringArray(str(formData, 'tagIdsJson'));
  if (!tagIds.ok) return { ok: false, error: tagIds.error };

  const body: Record<string, unknown> = {
    title,
    slug,
    content,
    featured: formData.get('featured') === 'on',
    excerpt: str(formData, 'excerpt') || null,
    categoryId: str(formData, 'categoryId') || null,
    coverMediaId: str(formData, 'coverMediaId') || null,
    tagIds: tagIds.value,
    seoTitle: str(formData, 'seoTitle') || null,
    seoDescription: str(formData, 'seoDescription') || null,
    seoKeywords: str(formData, 'seoKeywords') || null,
    canonicalUrl: str(formData, 'canonicalUrl') || null,
    ogTitle: str(formData, 'ogTitle') || null,
    ogDescription: str(formData, 'ogDescription') || null,
    ogImage: str(formData, 'ogImage') || null,
    twitterTitle: str(formData, 'twitterTitle') || null,
    twitterDescription: str(formData, 'twitterDescription') || null,
  };

  const token = await getSessionToken();
  const result = id ? await updateBlogPost(token, id, body) : await createBlogPost(token, body);

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog');
  if (id) revalidatePath(`/blog/${id}/edit`);
  return { ok: true, savedId: result.data.id };
}

/** 删除文章 */
export async function deleteBlogPostAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteBlogPost(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog');
  return { ok: true };
}

/* ============================== 分类 ============================== */

export async function createBlogCategoryAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const name = str(formData, 'name');
  const slug = str(formData, 'slug');
  if (!name || !slug) return { ok: false, error: '请填写分类名称与 slug' };

  const sortOrderRaw = str(formData, 'sortOrder');
  const description = str(formData, 'description');

  const token = await getSessionToken();
  const result = await createBlogCategory(token, {
    name,
    slug,
    description: description || undefined,
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : 0,
    isActive: formData.get('isActive') === 'on',
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog/categories');
  return { ok: true };
}

export async function updateBlogCategoryAction(
  id: string,
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const name = str(formData, 'name');
  const slug = str(formData, 'slug');
  if (!name || !slug) return { ok: false, error: '请填写分类名称与 slug' };

  const sortOrderRaw = str(formData, 'sortOrder');

  const token = await getSessionToken();
  const result = await updateBlogCategory(token, id, {
    name,
    slug,
    description: str(formData, 'description'),
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : 0,
    isActive: formData.get('isActive') === 'on',
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog/categories');
  return { ok: true };
}

export async function deleteBlogCategoryAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteBlogCategory(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog/categories');
  return { ok: true };
}

/* ============================== 标签 ============================== */

export async function createBlogTagAction(
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const name = str(formData, 'name');
  const slug = str(formData, 'slug');
  if (!name || !slug) return { ok: false, error: '请填写标签名称与 slug' };

  const token = await getSessionToken();
  const result = await createBlogTag(token, { name, slug });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog/tags');
  return { ok: true };
}

export async function updateBlogTagAction(
  id: string,
  _prevState: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const name = str(formData, 'name');
  const slug = str(formData, 'slug');
  if (!name || !slug) return { ok: false, error: '请填写标签名称与 slug' };

  const token = await getSessionToken();
  const result = await updateBlogTag(token, id, { name, slug });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog/tags');
  return { ok: true };
}

export async function deleteBlogTagAction(id: string): Promise<SimpleFormState> {
  const token = await getSessionToken();
  const result = await deleteBlogTag(token, id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/blog/tags');
  return { ok: true };
}

/* ======================= 媒体库（封面选择器） ======================= */

export interface MediaPickerResult {
  ok: boolean;
  items: MediaAsset[];
  total: number;
  totalPages: number;
  error?: string;
}

/**
 * 为封面选择器拉取媒体库列表。
 *
 * 博客模块**不自行上传文件**——封面只能从 Phase 4.3 媒体库中挑选，
 * 因此这里只读复用 /cms/media 列表接口。
 */
export async function fetchMediaForPicker(page = 1, keyword = ''): Promise<MediaPickerResult> {
  const token = await getSessionToken();
  const result = await listMedia(token, {
    page,
    limit: 24,
    keyword: keyword.trim() || undefined,
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
