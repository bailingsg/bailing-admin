'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showToast } from '@/components/ui/toast';
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from '@/lib/avatar';
import { removeMyAvatarAction, uploadMyAvatarAction } from './actions';

/**
 * 我的头像（自助上传）。
 *
 * 业务规则：
 *   · 员工自己就能换头像，不必找管理员开 contacts.update 权限
 *   · 选文件后**立即上传**（不走「保存修改」按钮）：头像独立于资料表单，
 *     避免改了头像却忘了点保存
 *   · 替换时后端「先传新对象 → 落库 → **删除服务器上的旧文件**」，
 *     存储里不会残留旧头像；前端只负责展示新地址
 *   · 移除头像同样会删除存储对象
 */
export function AvatarCard({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [preview, setPreview] = React.useState<string | null>(avatarUrl);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 服务端刷新后（revalidatePath + router.refresh）以最新地址为准
  React.useEffect(() => {
    setPreview(avatarUrl);
  }, [avatarUrl]);

  function submitAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 重置 input，保证连续选同一个文件也能触发 change
    event.target.value = '';
    if (!file) return;

    setError(null);

    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      setError(`不支持的头像格式：${file.type || '未知'}（仅支持 JPEG / PNG / WebP / AVIF）`);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(`头像不能超过 ${Math.floor(AVATAR_MAX_BYTES / 1024 / 1024)}MB`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const result = await uploadMyAvatarAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result.data.contact?.avatarUrl ?? null);
      showToast(preview ? '头像已更新（旧头像文件已从服务器删除）' : '头像已上传');
      router.refresh();
    });
  }

  function removeAvatar() {
    setError(null);
    startTransition(async () => {
      const result = await removeMyAvatarAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(null);
      showToast('头像已移除（服务器文件已删除）');
      router.refresh();
    });
  }

  const initial = (name ?? '').trim().slice(0, 1) || '?';

  return (
    <Card>
      <CardHeader>
        <CardTitle>我的头像</CardTitle>
        <CardDescription>
          上传后显示在官网联系页（需同时开启「在官网展示我的联系方式」）。支持 JPEG / PNG / WebP / AVIF，
          不超过 {Math.floor(AVATAR_MAX_BYTES / 1024 / 1024)}MB。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- 后台管理界面，动态图床 URL 无需 next/image 优化
            <img
              src={preview}
              alt={`${name || '我的'}的头像`}
              className="size-20 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-surface text-heading-sm text-text-muted"
            >
              {initial}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                {pending ? '上传中…' : preview ? '更换头像' : '上传头像'}
              </Button>
              {preview ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={removeAvatar}
                >
                  移除头像
                </Button>
              ) : null}
            </div>
            {/* input 隐藏：由按钮触发，避免原生文件选择器的难看样式 */}
            <input
              ref={fileInputRef}
              id="my-avatar"
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={submitAvatar}
            />
            <p className="text-caption text-text-muted">
              更换头像时，服务器上的旧头像文件会被自动删除，不会残留。
            </p>
            {error ? (
              <p role="alert" className="text-small text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
