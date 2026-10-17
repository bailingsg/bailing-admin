'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { decideRequestAction, withdrawRequestAction } from '../actions';
import type { SampleRequestItem } from '@/lib/samples';

/** 申请人可撤回自己的待审批申请；持有人可审批针对本人样品的待审批申请 */
export function RequestActions({
  request,
  canDecide,
}: {
  request: SampleRequestItem;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const isPending = request.status === 'PENDING';

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawRequestAction(request.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function decide(decision: 'APPROVE' | 'REJECT') {
    startTransition(async () => {
      const result = await decideRequestAction(request.id, decision);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApproveOpen(false);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {isPending ? (
        <>
          <Button type="button" variant="outline" size="sm" onClick={withdraw} disabled={pending}>
            {pending ? '处理中…' : '撤回'}
          </Button>
          {canDecide ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setApproveOpen(true)}
            >
              审批
            </Button>
          ) : null}
        </>
      ) : null}

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="审批出库申请"
        description={`样品 ${request.sampleCode}（${request.sampleName}）`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setApproveOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setApproveOpen(false);
                setConfirmOpen(true);
              }}
            >
              同意出库
            </Button>
            <Button variant="outline" onClick={() => decide('REJECT')} disabled={pending}>
              拒绝申请
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-2 text-small">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-text-muted">申请人</dt>
            <dd className="text-foreground">{request.requesterName ?? request.requesterId}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-text-muted">申请时间</dt>
            <dd className="text-foreground">
              {new Date(request.createdAt).toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false,
              })}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-text-muted">申请说明</dt>
            <dd className="text-foreground">{request.purpose}</dd>
          </div>
        </dl>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive"
          >
            {error}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="确认同意出库"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="danger" onClick={() => decide('APPROVE')} disabled={pending}>
              {pending ? '提交中…' : '确认同意'}
            </Button>
          </>
        }
      >
        <p className="text-small text-foreground">
          {request.requesterName ?? '该业务员'}申请出库。确认同意后，该样品将从系统正常样品列表中移除，其他业务员将无法继续查看和申请。
        </p>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive"
          >
            {error}
          </p>
        ) : null}
      </Modal>

      {/* 撤回等非弹窗内的失败提示 */}
      {error && !approveOpen && !confirmOpen ? (
        <p role="alert" className="mt-1 block text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
