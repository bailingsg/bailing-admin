'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { deleteInventoryAction } from './actions';

/**
 * 库存删除（Phase 5.3.2）。
 *
 * 交互约定：
 *   · 二次确认弹窗必须展示库存编号、产品名称、数量、存放位置，让用户看清删哪一条；
 *   · 删除成功后留在当前页面（库存列表 / 库存详情）并刷新数据，不跳转；
 *   · 删除只作用于库存行本身：关联订单、订单照片与其它库存记录均不受影响
 *     （后端 FK 为 RESTRICT，且删除动作不触及 orders 表）。
 */
export function DeleteInventoryButton({
  id,
  code,
  productName,
  quantityText,
  location,
  triggerLabel = '删除',
  compact = false,
}: {
  id: string;
  code: string;
  /** 以下三项用于确认弹窗展示，便于用户核对目标记录 */
  productName?: string;
  quantityText?: string;
  location?: string;
  triggerLabel?: string;
  /** 紧凑触发按钮（表格行内使用） */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const submittingRef = React.useRef(false);

  function confirm() {
    if (submittingRef.current) return;
    setError(null);
    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await deleteInventoryAction(id);
        if (!result.ok) {
          setError(result.error ?? '删除失败');
          return;
        }
        setOpen(false);
        // 先提示再刷新：刷新后本行会被移除（组件卸载），提示由全局宿主渲染
        showToast(`库存 ${code} 已删除`);
        router.refresh();
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'danger'}
        size={compact ? 'sm' : 'default'}
        className={compact ? 'text-destructive hover:bg-destructive/10' : undefined}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="删除库存"
        description="删除后不可恢复；关联订单与订单照片不受影响。"
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
        <dl className="mt-3 flex flex-col gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-small">
          {productName ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-text-muted">产品名称</dt>
              <dd className="text-foreground">{productName}</dd>
            </div>
          ) : null}
          {quantityText ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-text-muted">数量</dt>
              <dd className="text-foreground">{quantityText}</dd>
            </div>
          ) : null}
          {location ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-text-muted">存放位置</dt>
              <dd className="text-foreground">{location}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-caption text-text-muted">
          仅删除这条库存记录；该订单及其它数据不会被删除。
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
