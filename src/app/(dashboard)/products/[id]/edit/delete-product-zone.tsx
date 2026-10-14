'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteProductAction } from '../../actions';

/**
 * 危险区：删除产品（编辑页）。
 *
 * 两步确认（先点「删除产品」→ 再点「确认删除」）：
 * 比原生 window.confirm 更可控——不依赖浏览器对话框行为，
 * 也便于自动化测试与无障碍访问。
 * 删除经服务端 Action 完成（后端级联清理图片行与磁盘文件），成功后跳转列表页。
 */
export function DeleteProductZone({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (!result.ok) {
        setError(result.error ?? '删除失败');
        setConfirming(false);
        return;
      }
      router.push('/products');
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">危险区</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-small text-text-secondary">
          删除产品将同时删除其全部图片（含磁盘文件），且不可恢复。如只是想暂时下架，请将状态改为「已归档」。
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-small font-medium text-destructive">
              确认删除「{name}」？此操作不可恢复。
            </span>
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
              {pending ? '删除中…' : '确认删除'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirming(true)}
            className="w-fit"
          >
            删除产品
          </Button>
        )}
        {error ? (
          <p role="alert" className="text-small text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
