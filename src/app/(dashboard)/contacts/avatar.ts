/**
 * 头像上传的前端约束（兼容层）。
 *
 * 常量已收敛到 `@/lib/avatar`（contacts 与账号设置共用），
 * 这里保留 re-export，避免既有引用路径漂移。
 */
export { AVATAR_ACCEPT, AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '@/lib/avatar';
