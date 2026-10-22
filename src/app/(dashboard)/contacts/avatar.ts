/**
 * 头像上传的前端约束（纯常量，无 'use server'）。
 *
 * 为什么单独成文件：`'use server'` 文件**只允许导出 async 函数**，
 * 常量（AVATAR_ACCEPT / AVATAR_MAX_BYTES）导出后整包构建会直接失败，
 * 而客户端组件又不能从服务端文件里拿非函数导出。故常量独立成普通模块。
 *
 * 与后端一致：后端还有 MIME 白名单 + 魔数校验双保险，此处只做前端预检。
 */

/** accept 属性：允许的图片类型 */
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/** 单文件体积上限（5MB） */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
