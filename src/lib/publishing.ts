import { authorizedRequest, type ApiResult } from './api';

/**
 * 内容发布工作流 API（Phase 1）。
 *
 * 六类可发布内容共用同一套端点形状：
 *   POST /cms/<kind>/:id/publish     发布（把编辑稿变成线上版本）
 *   POST /cms/<kind>/:id/unpublish   取消发布（下架，保留内容与历史）
 *   GET  /cms/<kind>/:id/preview     预览（线上版本 + 编辑稿）
 *   GET  /cms/<kind>/:id/revisions   发布历史
 *
 * `kind` 用后端控制器的路径片段，避免后台再维护一套实体枚举。
 */

export type PublishableKind =
  | 'products'
  | 'blog/posts'
  | 'factory'
  | 'quality'
  | 'applications'
  | 'site/sections';

/** 后台展示用的中文实体名 */
export const PUBLISHABLE_LABELS: Record<PublishableKind, string> = {
  products: '产品',
  'blog/posts': '文章',
  factory: '工厂分区',
  quality: '质量记录',
  applications: '应用场景',
  'site/sections': '站点分区',
};

/** 运行时判定：URL 片段是否为合法的可发布类型 */
export function isPublishableKind(value: string): value is PublishableKind {
  return Object.prototype.hasOwnProperty.call(PUBLISHABLE_LABELS, value);
}

/** 发布权限 key（与后端 permission.registry.ts 逐字对应） */
export const PUBLISH_PERMISSIONS: Record<PublishableKind, { publish: string; unpublish: string }> = {
  products: { publish: 'products.publish', unpublish: 'products.unpublish' },
  'blog/posts': { publish: 'blog.publish', unpublish: 'blog.unpublish' },
  factory: { publish: 'factory.publish', unpublish: 'factory.unpublish' },
  quality: { publish: 'quality.publish', unpublish: 'quality.unpublish' },
  applications: { publish: 'applications.publish', unpublish: 'applications.unpublish' },
  'site/sections': { publish: 'site.publish', unpublish: 'site.unpublish' },
};

/** 预览响应（后端 previewEntity 的输出） */
export interface ContentPreview<T> {
  entity: T;
  /** 编辑稿（Update DTO 快照）；无编辑稿为 null */
  draft: Record<string, unknown> | null;
  draftVersion: number | null;
  publishedVersion: number;
  status: string;
  hasUnpublishedChanges: boolean;
}

/** 发布版本历史条目 */
export interface ContentRevision {
  id: string;
  version: number;
  action: 'PUBLISH' | 'UNPUBLISH';
  publishedById: string | null;
  publishedAt: string;
  note: string | null;
  snapshot: unknown;
}

/** 发布（需要 <module>.publish 权限） */
export function publishContent<T>(
  token: string | null,
  kind: PublishableKind,
  id: string,
): Promise<ApiResult<T>> {
  return authorizedRequest<T>(`/cms/${kind}/${id}/publish`, token, { method: 'POST' });
}

/** 取消发布（需要 <module>.unpublish 权限） */
export function unpublishContent<T>(
  token: string | null,
  kind: PublishableKind,
  id: string,
): Promise<ApiResult<T>> {
  return authorizedRequest<T>(`/cms/${kind}/${id}/unpublish`, token, { method: 'POST' });
}

/** 预览：线上版本 + 编辑稿（需要 <module>.read 权限） */
export function getContentPreview<T>(
  token: string | null,
  kind: PublishableKind,
  id: string,
): Promise<ApiResult<ContentPreview<T>>> {
  return authorizedRequest<ContentPreview<T>>(`/cms/${kind}/${id}/preview`, token);
}

/** 发布历史 */
export function getContentRevisions(
  token: string | null,
  kind: PublishableKind,
  id: string,
): Promise<ApiResult<ContentRevision[]>> {
  return authorizedRequest<ContentRevision[]>(`/cms/${kind}/${id}/revisions`, token);
}
