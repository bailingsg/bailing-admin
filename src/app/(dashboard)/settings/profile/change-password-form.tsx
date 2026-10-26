'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/components/ui/toast';
import { changeMyPasswordAction } from './actions';

/** 新口令最小长度（与后端 ChangePasswordDto 一致） */
const MIN_LENGTH = 8;

/**
 * 修改登录口令（自助）。
 *
 * 设计要点：
 *   · 必须输入**当前口令**：防止他人借用未锁屏的会话直接改密码
 *   · 前端预检「两次输入一致 / 长度 / 新旧不同」，减少一次往返；
 *     真正的边界（当前口令是否正确）只有后端能判断
 *   · 后端口令错误返回 400，不会被当成「登录失效」踢回登录页
 *   · 改完不清会话：当前 JWT 继续有效，其他设备最迟在一个令牌有效期后需重新登录
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  function submit() {
    setError(null);

    if (currentPassword === '') {
      setError('请输入当前口令');
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`新口令至少 ${MIN_LENGTH} 位`);
      return;
    }
    if (newPassword.length > 72) {
      setError('新口令最多 72 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新口令不一致');
      return;
    }
    if (newPassword === currentPassword) {
      setError('新口令不能与当前口令相同');
      return;
    }

    startTransition(async () => {
      const result = await changeMyPasswordAction({ currentPassword, newPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      showToast('口令已修改，下次登录请使用新口令');
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>修改登录口令</CardTitle>
        <CardDescription>
          需要先验证当前口令。修改后当前会话继续有效，其他已登录设备最迟在令牌过期后需重新登录。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-current">当前口令</Label>
            <Input
              id="password-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              maxLength={128}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="请输入当前口令"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-new">新口令</Label>
            <Input
              id="password-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              maxLength={72}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={`至少 ${MIN_LENGTH} 位`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-confirm">确认新口令</Label>
            <Input
              id="password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              maxLength={72}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再输入一次新口令"
            />
          </div>

          {error ? (
            <p role="alert" className="text-small text-destructive sm:col-span-3">
              {error}
            </p>
          ) : null}

          <div className="sm:col-span-3">
            <Button type="submit" size="default" disabled={pending}>
              {pending ? '提交中…' : '修改口令'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
