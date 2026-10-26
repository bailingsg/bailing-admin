/**
 * 头像上传的前端约束（纯常量，无 'use server'）。
 *
 * 为什么单独成文件：`'use server'` 文件**只允许导出 async 函数**，
 * 常量导出后整包构建会直接失败，而客户端组件又不能从服务端文件里拿非函数导出。
 *
 * 单一事实源：员工联系方式（contacts）与账号设置（settings/profile）共用同一套约束，
 * 避免两处上限漂移。与后端一致——后端还有 MIME 白名单 + 魔数校验双保险，
 * 此处只做前端预检。
 */

/** accept 属性：允许的图片类型 */
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/** 单文件体积上限（5MB） */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** 允许的 MIME 列表（与 AVATAR_ACCEPT 对应，供代码内校验） */
export const AVATAR_MIME_TYPES = AVATAR_ACCEPT.split(',');
