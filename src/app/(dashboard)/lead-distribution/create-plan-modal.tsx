'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, FormField } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  createPlanAction,
  fetchEligibleAssigneesAction,
} from './actions';
import type { EligibleAssignee } from '@/lib/lead-distribution';

/**
 * 创建倾斜计划弹窗。
 *
 * 员工列表与账号状态全部来自后端 GET /cms/lead-distribution/plans/eligible：
 *   · 已停用账号 / 未标记为询盘联系人的员工会明确标注（仍可加入计划，
 *     但在其恢复可用前不参与分配）
 *   · 已在其它生效计划中的员工不可重复加入（后端同样会拒绝）
 */
export function CreatePlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [employees, setEmployees] = React.useState<EligibleAssignee[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [selected, setSelected] = React.useState<Record<string, string>>({});
  const [startAt, setStartAt] = React.useState('');
  const [endAt, setEndAt] = React.useState('');
  const [cooldownMinutes, setCooldownMinutes] = React.useState('0');

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setNotice(null);
    setName('');
    setSelected({});
    setStartAt('');
    setEndAt('');
    setCooldownMinutes('0');
    setLoading(true);
    void fetchEligibleAssigneesAction().then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        setEmployees([]);
        return;
      }
      setEmployees(result.data);
    });
  }, [open]);

  function toggleEmployee(id: string) {
    setSelected((current) => {
      const next = { ...current };
      if (id in next) delete next[id];
      else next[id] = '1';
      return next;
    });
  }

  function setTarget(id: string, value: string) {
    setSelected((current) => ({ ...current, [id]: value }));
  }

  function submit() {
    setError(null);
    setNotice(null);

    const planName = name.trim();
    if (planName.length < 2) {
      setError('请填写计划名称（至少 2 个字符）');
      return;
    }

    const items = Object.entries(selected).map(([adminUserId, target]) => {
      const count = Number.parseInt(target, 10);
      return { adminUserId, targetCount: Number.isFinite(count) ? count : 0, sortOrder: 0 };
    });
    if (items.length === 0) {
      setError('请至少选择一名倾斜员工');
      return;
    }
    const invalid = items.filter((item) => item.targetCount < 1);
    if (invalid.length > 0) {
      setError('每名员工的目标数量必须是不小于 1 的整数');
      return;
    }
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError('截止时间必须晚于生效时间');
      return;
    }
    const cooldownSeconds = Math.max(0, (Number.parseInt(cooldownMinutes, 10) || 0) * 60);

    startTransition(async () => {
      const result = await createPlanAction({
        name: planName,
        items: items.map((item, index) => ({ ...item, sortOrder: index })),
        cooldownSeconds,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { plan, skipped } = result.data;
      if (skipped.length > 0) {
        const names = skipped
          .map((id) => employees.find((e) => e.adminUserId === id)?.name ?? id)
          .join('、');
        setNotice(
          `计划「${plan.name}」已创建。以下员工账号当前不可分配（已恢复后自动参与）：${names}`,
        );
        // 提示与刷新都保留：既让操作人看到原因，也让页面拿到最新状态
        router.refresh();
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="创建倾斜计划"
      description="计划生效期间，新询盘优先分配给计划内员工，按各自目标数量轮流承接；目标全部达成后计划自动完成。"
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={pending || loading}>
            {pending ? '创建中…' : '创建计划'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormField
          label="计划名称"
          htmlFor="plan-name"
          required
          hint="例如：Q4 重点客户倾斜、华南区新人培养计划"
        >
          <Input
            id="plan-name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="请输入计划名称"
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-small font-medium text-foreground">倾斜员工与目标数量</span>
            <span className="text-caption text-text-muted">
              已选 {Object.keys(selected).length} 人 · 目标合计{' '}
              {Object.values(selected).reduce(
                (sum, value) => sum + (Number.parseInt(value, 10) || 0),
                0,
              )}{' '}
              单
            </span>
          </div>

          {loading ? (
            <p className="py-6 text-center text-small text-text-secondary">加载员工列表…</p>
          ) : employees.length === 0 ? (
            <p className="py-6 text-center text-small text-text-secondary">
              暂无可分配的员工。请先在「员工联系方式」中把员工标记为询盘联系人。
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {employees.map((employee) => {
                const checked = employee.adminUserId in selected;
                const unavailable = !employee.isActive || !employee.isLeadContact;
                return (
                  <li
                    key={employee.adminUserId}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5"
                  >
                    <label className="flex flex-1 items-center gap-2 text-small text-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(employee.adminUserId)}
                        className="size-4 accent-[var(--primary)]"
                        disabled={employee.inActivePlan}
                        aria-label={`选择 ${employee.name ?? employee.email}`}
                      />
                      <span className="font-medium">{employee.name ?? '—'}</span>
                      <span className="text-caption text-text-muted">{employee.email}</span>
                    </label>

                    {unavailable ? (
                      <Badge variant="destructive">
                        {!employee.isActive ? '账号已停用' : '未标记询盘联系人'}
                      </Badge>
                    ) : employee.inActivePlan ? (
                      <Badge variant="outline">已在生效计划中</Badge>
                    ) : (
                      <Badge variant="success">可分配</Badge>
                    )}

                    <label className="flex items-center gap-2 text-caption text-text-muted">
                      目标
                      <Input
                        type="number"
                        min={1}
                        max={100000}
                        value={checked ? selected[employee.adminUserId] : ''}
                        disabled={!checked}
                        onChange={(event) => setTarget(employee.adminUserId, event.target.value)}
                        className="h-8 w-20 text-small"
                        aria-label={`${employee.name ?? employee.email} 的目标数量`}
                      />
                      单
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="生效时间" htmlFor="plan-start" hint="留空 = 立即生效">
            <Input
              id="plan-start"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </FormField>
          <FormField label="截止时间" htmlFor="plan-end" hint="留空 = 达成目标后自然完成">
            <Input
              id="plan-end"
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </FormField>
          <FormField
            label="冷却时间（分钟）"
            htmlFor="plan-cooldown"
            hint="手动关闭后自动恢复的等待时间，0 = 仅允许手动恢复"
          >
            <Input
              id="plan-cooldown"
              type="number"
              min={0}
              max={43200}
              value={cooldownMinutes}
              onChange={(event) => setCooldownMinutes(event.target.value)}
            />
          </FormField>
        </div>

        {error ? (
          <p role="alert" className="text-small text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-small text-warning-600">
            {notice}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
