'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal, ProgressBar } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import {
  PLAN_STATUS_LABELS,
  SOURCE_LABELS,
  type Assignment,
  type Plan,
} from '@/lib/lead-distribution';
import { closePlanAction } from './actions';

/**
 * 查看倾斜计划弹窗（Phase 4.6 规格核心交互）。
 *
 * 所有进度数字均来自后端 GET /cms/lead-distribution 返回的 Plan 对象：
 * 计划名称 / 生效时间 / 状态 / 每人员目标数量 / 已成功分配数量 / 剩余数量 /
 * 完成百分比 / 员工账号状态 / 最近分配记录 —— **前端不写死任何示例数字**。
 *
 * 「关闭弹窗」只是关闭弹窗本身；「手动关闭计划」是真实业务操作（两步确认），
 * 两者语义严格区分。
 */
export function PlanProgressModal({
  open,
  plan,
  assignments,
  canClose,
  onClose,
}: {
  open: boolean;
  plan: Plan;
  assignments: Assignment[];
  canClose: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setConfirming(false);
    setError(null);
    setReason('');
  }, [open]);

  const planAssignments = React.useMemo(
    () => assignments.filter((item) => item.planId === plan.id).slice(0, 10),
    [assignments, plan.id],
  );

  function closePlan() {
    setError(null);
    startTransition(async () => {
      const result = await closePlanAction(plan.id, reason.trim() || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan.name}
      description={`倾斜计划 · 创建人 ${plan.createdByEmail ?? '—'}`}
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            关闭弹窗
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/lead-distribution/${plan.id}`}>计划详情</Link>
          </Button>
          {canClose && plan.status === 'ACTIVE' ? (
            confirming ? (
              <>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={closePlan}
                  disabled={pending}
                >
                  {pending ? '关闭中…' : '确认关闭计划'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                >
                  取消
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirming(true)}
              >
                手动关闭计划
              </Button>
            )
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* 计划概览 */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={plan.isInEffect ? 'success' : 'outline'}>
            {PLAN_STATUS_LABELS[plan.status]}
            {plan.isPendingStart ? ' · 待生效' : ''}
            {plan.isPendingResume ? ' · 冷却暂停' : ''}
          </Badge>
          {plan.isInEffect ? <Badge variant="warning">当前分配模式：倾斜计划</Badge> : null}
          {plan.hasTiltCapacity ? null : plan.status === 'ACTIVE' ? (
            <Badge variant="destructive">当前无可分配员工</Badge>
          ) : null}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-caption text-text-muted">生效时间</dt>
            <dd className="text-small text-foreground">
              {formatDateTime(plan.startAt)}
              {plan.endAt ? ` 至 ${formatDateTime(plan.endAt)}` : ' · 无截止时间'}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">整体进度</dt>
            <dd className="mt-1">
              <ProgressBar
                percent={plan.completionPercent}
                label="计划整体完成度"
                tone={plan.completionPercent >= 100 ? 'success' : 'primary'}
              />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">已分配 / 目标</dt>
            <dd className="text-small text-foreground">
              {plan.totalAssigned} / {plan.totalTarget} 单
            </dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">冷却设置</dt>
            <dd className="text-small text-foreground">
              {plan.cooldownSeconds > 0
                ? `关闭后 ${plan.cooldownSeconds} 秒自动恢复`
                : '关闭后仅可手动恢复'}
            </dd>
          </div>
          {plan.closedByEmail ? (
            <div>
              <dt className="text-caption text-text-muted">关闭人</dt>
              <dd className="text-small text-foreground">
                {plan.closedByEmail} · {plan.closedAt ? formatDateTime(plan.closedAt) : '—'}
              </dd>
            </div>
          ) : null}
          {plan.resumeAt ? (
            <div>
              <dt className="text-caption text-text-muted">预计恢复时间</dt>
              <dd className="text-small text-foreground">{formatDateTime(plan.resumeAt)}</dd>
            </div>
          ) : null}
        </dl>

        {/* 人员进度 */}
        <div>
          <h3 className="text-small font-semibold text-foreground">倾斜员工进度</h3>
          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-2.5 font-medium">顺序</th>
                  <th className="px-4 py-2.5 font-medium">员工</th>
                  <th className="px-4 py-2.5 font-medium">目标</th>
                  <th className="px-4 py-2.5 font-medium">已分配</th>
                  <th className="px-4 py-2.5 font-medium">剩余</th>
                  <th className="px-4 py-2.5 font-medium">完成度</th>
                  <th className="px-4 py-2.5 font-medium">账号状态</th>
                </tr>
              </thead>
              <tbody>
                {plan.items.map((item) => (
                  <tr key={item.adminUserId} className="border-t border-border">
                    <td className="px-4 py-2.5 text-small text-text-secondary">
                      {item.sortOrder + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-small font-medium text-foreground">
                        {item.name ?? '—'}
                      </span>
                      <div className="text-caption text-text-muted">{item.email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-small text-text-secondary">
                      {item.targetCount}
                    </td>
                    <td className="px-4 py-2.5 text-small text-text-secondary">
                      {item.assignedCount}
                    </td>
                    <td className="px-4 py-2.5 text-small text-text-secondary">
                      {item.remainingCount}
                    </td>
                    <td className="px-4 py-2.5">
                      <ProgressBar
                        percent={item.completionPercent}
                        label={`${item.name ?? item.email} 完成度`}
                        tone={item.completionPercent >= 100 ? 'success' : 'primary'}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {item.isEmployeeActive ? (
                        item.isEligible ? (
                          <Badge variant="success">可分配</Badge>
                        ) : (
                          <Badge variant="warning">暂不参与分配</Badge>
                        )
                      ) : (
                        <Badge variant="destructive">账号已停用</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 最近分配记录（仅本计划） */}
        <div>
          <h3 className="text-small font-semibold text-foreground">本计划最近分配</h3>
          {planAssignments.length === 0 ? (
            <p className="mt-2 text-small text-text-secondary">
              该计划暂无分配记录。计划生效后，新询盘会按员工顺序轮流分配给计划内成员。
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {planAssignments.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-small text-foreground">
                    {item.assignee.name ?? item.assignee.email}
                    <span className="ml-2 text-caption text-text-muted">
                      {item.rfqSummary.company} · {item.rfqSummary.country}
                    </span>
                  </span>
                  <span className="text-caption text-text-muted">
                    {SOURCE_LABELS[item.source]} · {formatDateTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3">
            <p className="text-small text-foreground">
              确认关闭计划「{plan.name}」？关闭后询盘将恢复按正常轮询队列分配。
            </p>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="关闭原因（可选，会记入操作日志）"
              maxLength={300}
              aria-label="关闭原因"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-small text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
