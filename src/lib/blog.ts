/**
 * 管理后台 —— Blog CMS API 访问层（服务端）。
 *
 * 全部走 HttpOnly Cookie 中的 JWT（Authorization: Bearer 转发给后端
 * /api/v1/cms/blog/** 接口，均受 JwtAuthGuard 保护）。
 * 浏览器端 JS 永远拿不到令牌。
 */

import { authorizedRequest, type ApiResult } from './api';

/* ------------------------------- 类型 ------------------------------- */

/**
 * 博客文章发布状态（Phase 4.7 统一三态，与后端 PostStatus 对齐）：
 *   DRAFT（草稿）→ PUBLISHED（已发布）→ ARCHIVED（已归档）
 * 公开 API 只读 PUBLISHED；DRAFT / ARCHIVED 一律不可见。
 */
export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const POST_STATUSES: PostStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt: string;
}

export interface BlogTagRef {
  id: string;
  name: string;
  slug: string;
}

export interface BlogCoverMediaRef {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: PostStatus;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  tags: BlogTagRef[];
  coverImageUrl: string | null;
  coverMediaId: string | null;
  author: { id: string; name: string } | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostDetail extends BlogPostListItem {
  content: string;
  categoryId: string | null;
  tagIds: string[];
  coverMedia: BlogCoverMediaRef | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
}

export interface PaginatedBlogPosts {
  items: BlogPostListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListBlogPostsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: PostStatus;
  categoryId?: string;
  tagId?: string;
  featured?: boolean;
}

/* ------------------------------- 文章 ------------------------------- */

/** 文章列表（分页 + keyword/status/categoryId/tagId/featured 筛选） */
export function listBlogPosts(
  token: string | null,
  params: ListBlogPostsParams = {},
): Promise<ApiResult<PaginatedBlogPosts>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.status) search.set('status', params.status);
  if (params.categoryId) search.set('categoryId', params.categoryId);
  if (params.tagId) search.set('tagId', params.tagId);
  if (params.featured !== undefined) search.set('featured', String(params.featured));
  const query = search.toString();
  return authorizedRequest<PaginatedBlogPosts>(`/cms/blog/posts${query ? `?${query}` : ''}`, token);
}

/** 文章详情（编辑页数据源） */
export function getBlogPost(token: string | null, id: string): Promise<ApiResult<BlogPostDetail>> {
  return authorizedRequest<BlogPostDetail>(`/cms/blog/posts/${id}`, token);
}

/** 创建文章 */
export function createBlogPost(
  token: string | null,
  body: Record<string, unknown>,
): Promise<ApiResult<BlogPostDetail>> {
  return authorizedRequest<BlogPostDetail>('/cms/blog/posts', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 更新文章（PATCH） */
export function updateBlogPost(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<ApiResult<BlogPostDetail>> {
  return authorizedRequest<BlogPostDetail>(`/cms/blog/posts/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 删除文章 */
export function deleteBlogPost(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/blog/posts/${id}`, token, { method: 'DELETE' });
}

/* ------------------------------- 分类 ------------------------------- */

/** 博客分类列表（含文章计数，按 sortOrder 升序） */
export function listBlogCategories(token: string | null): Promise<ApiResult<BlogCategory[]>> {
  return authorizedRequest<BlogCategory[]>('/cms/blog/categories', token);
}

/** 创建博客分类 */
export function createBlogCategory(
  token: string | null,
  body: { name: string; slug: string; description?: string; sortOrder?: number; isActive?: boolean },
): Promise<ApiResult<BlogCategory>> {
  return authorizedRequest<BlogCategory>('/cms/blog/categories', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 更新博客分类（PATCH：仅传提供的字段） */
export function updateBlogCategory(
  token: string | null,
  id: string,
  body: { name?: string; slug?: string; description?: string; sortOrder?: number; isActive?: boolean },
): Promise<ApiResult<BlogCategory>> {
  return authorizedRequest<BlogCategory>(`/cms/blog/categories/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 删除博客分类（分类下有文章时后端返回 400） */
export function deleteBlogCategory(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/blog/categories/${id}`, token, { method: 'DELETE' });
}

/* ------------------------------- 标签 ------------------------------- */

/** 博客标签列表（含引用计数，按名称升序） */
export function listBlogTags(token: string | null): Promise<ApiResult<BlogTag[]>> {
  return authorizedRequest<BlogTag[]>('/cms/blog/tags', token);
}

/** 创建博客标签 */
export function createBlogTag(
  token: string | null,
  body: { name: string; slug: string },
): Promise<ApiResult<BlogTag>> {
  return authorizedRequest<BlogTag>('/cms/blog/tags', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** 更新博客标签 */
export function updateBlogTag(
  token: string | null,
  id: string,
  body: { name?: string; slug?: string },
): Promise<ApiResult<BlogTag>> {
  return authorizedRequest<BlogTag>(`/cms/blog/tags/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 删除博客标签（级联移除文章关联） */
export function deleteBlogTag(token: string | null, id: string): Promise<ApiResult<{ id: string }>> {
  return authorizedRequest<{ id: string }>(`/cms/blog/tags/${id}`, token, { method: 'DELETE' });
}

/* ------------------------------- 展示辅助 ------------------------------- */

/** 删除失败的友好提示映射（后端 message → 中文业务解释） */
export function friendlyBlogDeleteError(message: string): string {
  if (message.includes('Media asset is in use.')) {
    return '该媒体正被博客封面引用，请先解除引用后再删除';
  }
  return message;
}
