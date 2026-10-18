'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { deleteInventoryAction } from './actions';

/** 库存删除（二次确认；删除后不级联影响订单） */
export function DeleteInventoryButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteInventoryAction(id);
      if (!result.ok) {
        setError(result.error ?? '删除失败');
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        删除
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="删除库存"
        description="删除后不可恢复；订单及订单照片不受影响。"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={confirm}>
              {pending ? '删除中…' : '确认删除'}
            </Button>
          </>
        }
      >
        <p className="text-small text-foreground">
          确认删除库存 <span className="font-medium">{code}</span> 吗？
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-small text-destructive">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  );
}
