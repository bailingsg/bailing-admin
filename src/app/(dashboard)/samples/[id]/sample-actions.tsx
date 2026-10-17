'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { decideRequestAction, requestSampleAction, withdrawRequestAction } from '../actions';
import type { SampleDetail } from '@/lib/samples';

/**
 * 样品详情页动作区（Phase 5.1）。
 *
 * 按身份渲染：持有人可审批待审批申请；被授权业务员可申请出库；
 * 申请人可撤回自己的申请。「同意」有二次确认弹窗（任务书 3.6）。
 * 注意：按钮只是入口，真正的权限判定在服务端。
 */
export function SampleActions({
  sample,
  isOwner,
  granted,
  isRequester,
}: {
  sample: SampleDetail;
  isOwner: boolean;
  granted: boolean;
  isRequester: boolean;
}) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [purpose, setPurpose] = React.useState('');

  const canApply =
    !isOwner && granted && (sample.status === 'IN_STOCK' || sample.status === 'REJECTED');
  const canApprove = isOwner && sample.pendingRequest?.requesterId !== sample.ownerId;
  const canWithdraw = isRequester && sample.pendingRequest !== null;

  function submitApply() {
    if (!purpose.trim()) {
      setError('申请说明不能为空');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestSampleAction(sample.id, purpose.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApplyOpen(false);
      setPurpose('');
      router.refresh();
    });
  }

  function decide(decision: 'APPROVE' | 'REJECT') {
    if (!sample.pendingRequest) return;
    setError(null);
    startTransition(async () => {
      const result = await decideRequestAction(sample.pendingRequest!.id, decision);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApproveOpen(false);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  function withdraw() {
    if (!sample.pendingRequest) return;
    startTransition(async () => {
      const result = await withdrawRequestAction(sample.pendingRequest!.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {canApply ? (
        <Button type="button" variant="primary" onClick={() => setApplyOpen(true)}>
          申请出库
        </Button>
      ) : null}
      {canWithdraw ? (
        <Button type="button" variant="outline" onClick={withdraw} disabled={pending}>
          {pending ? '处理中…' : '撤回申请'}
        </Button>
      ) : null}
      {canApprove ? (
        <Button type="button" variant="primary" onClick={() => setApproveOpen(true)}>
          审批出库申请
        </Button>
      ) : null}

      {/* 申请出库 */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="申请出库"
        description={`样品 ${sample.code}（${sample.name}）`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setApplyOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={submitApply} disabled={pending}>
              {pending ? '提交中…' : '提交申请'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive">
              {error}
            </p>
          ) : null}
          <label htmlFor="purpose" className="text-small font-medium text-foreground">
            申请说明 / 用途
          </label>
          <Textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="请说明出库用途（如：客户看样、展会样品等）"
          />
        </div>
      </Modal>

      {/* 审批弹窗 */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="审批出库申请"
        description={`样品 ${sample.code}（${sample.name}）`}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => decide('REJECT')}
              disabled={pending}
            >
              拒绝申请
            </Button>
          </>
        }
      >
        {sample.pendingRequest ? (
          <dl className="flex flex-col gap-2 text-small">
            <Row label="样品编号" value={sample.code} />
            <Row label="样品名称" value={sample.name} />
            <Row
              label="申请业务员"
              value={sample.pendingRequest.requesterName ?? sample.pendingRequest.requesterId}
            />
            <Row
              label="申请时间"
              value={new Date(sample.pendingRequest.createdAt).toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false,
              })}
            />
            <Row label="申请说明" value={sample.pendingRequest.purpose} />
          </dl>
        ) : null}
      </Modal>

      {/* 同意二次确认 */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="确认同意出库"
        description="请再次确认本次审批"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => decide('APPROVE')}
              disabled={pending}
            >
              {pending ? '提交中…' : '确认同意'}
            </Button>
          </>
        }
      >
        <p className="text-small text-foreground">
          {sample.pendingRequest?.requesterName ?? '该业务员'}申请出库。确认同意后，该样品将从系统正常样品列表中移除，其他业务员将无法继续查看和申请。
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-text-muted">{label}</dt>
      <dd className="text-foreground">{value || '—'}</dd>
    </div>
  );
}
