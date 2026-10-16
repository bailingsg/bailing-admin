import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import {
  getLeadDistributionState,
  PLAN_STATUS_LABELS,
  SOURCE_LABELS,
  type Assignment,
  type LeadDistributionState,
  type Plan,
} from '@/lib/lead-distribution';
import { PlanActionButton } from './plan-action-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '询盘分配',
  description: '询盘自动分配：正常轮询队列与倾斜计划，分配指针持久化在后端数据库。',
};

/**
 * 询盘分配总览（Phase 4.6）。
 *
 * 页面上的每个数字都来自 GET /api/v1/cms/lead-distribution：
 * 当前模式、轮询队列与顺序、下一位承接人、每人累计分配、待分配询盘数、
 * 近 7 日分配量、最近分配记录、生效中的倾斜计划进度。
 * 前端不推算、不写死任何示例值。
 */
export default async function LeadDistributionPage() {
  const token = await getSessionToken();
  const [adminResult, stateResult] = await Promise.all([
    getCurrentAdmin(token),
    getLeadDistributionState(token),
  ]);

  const admin: AdminProfile | null = adminResult.ok ? adminResult.data : null;

  if (!stateResult.ok) {
    return (
      <Container width="page" className="py-8">
        <PageHeader title="询盘分配" description="询盘自动分配：正常轮询队列与倾斜计划。" />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载询盘分配状态</p>
            <p className="text-small text-text-secondary">{stateResult.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const state: LeadDistributionState = stateResult.data;

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="询盘分配"
        description="新询盘按正常轮询顺序自动分配；开启倾斜计划后，计划内员工按目标数量轮流优先承接。"
        actions={
          <PlanActionButton
            plan={state.activePlan}
            recentAssignments={state.recentAssignments}
            canManage={hasPermission(admin, 'lead_distribution.manage')}
            canClose={hasPermission(admin, 'lead_distribution.close')}
          />
        }
      />

      {/* 关键指标 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="当前分配模式"
          value={SOURCE_LABELS[state.currentMode]}
          hint={
            state.currentMode === 'PRIORITY_PLAN'
              ? '倾斜计划生效中，询盘优先分配给计划内员工'
              : '询盘按队列顺序依次分配'
          }
        />
        <StatCard
          label="下一位承接人"
          value={state.nextAssignee?.name ?? state.nextAssignee?.email ?? '—'}
          hint={state.nextAssignee ? state.nextAssignee.email : '队列为空，暂不自动分配'}
        />
        <StatCard label="轮询队列人数" value={String(state.queueLength)} hint="启用且标记为询盘联系人的员工" />
        <StatCard
          label="待分配询盘"
          value={String(state.unassignedCount)}
          hint={`已分配 ${state.totalAssigned} 条`}
        />
      </div>

      {/* 生效中的倾斜计划摘要 */}
      {state.activePlan ? <ActivePlanSummary plan={state.activePlan} /> : null}

      {/* 轮询队列 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">正常轮询队列</CardTitle>
          <p className="text-caption text-text-muted">
            按此顺序依次承接新询盘；倾斜计划不会改变该队列的既有顺序，计划结束后自动恢复原顺序。
          </p>
        </CardHeader>
        <CardContent>
          {state.queue.length === 0 ? (
            <p className="py-6 text-center text-small text-text-secondary">
              队列为空。请在「员工联系方式」中将员工标记为询盘联系人并确保账号已启用。
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-table-header">
                  <tr className="text-caption text-text-secondary">
                    <th className="px-4 py-3 font-medium">顺序</th>
                    <th className="px-4 py-3 font-medium">员工</th>
                    <th className="px-4 py-3 font-medium">累计分配</th>
                    <th className="px-4 py-3 font-medium">账号状态</th>
                    <th className="px-4 py-3 font-medium">当前计划</th>
                  </tr>
                </thead>
                <tbody>
                  {state.queue.map((member) => {
                    const planItem = state.activePlan?.items.find(
                      (item) => item.adminUserId === member.adminUserId,
                    );
                    const isNext = state.nextAssignee?.adminUserId === member.adminUserId;
                    return (
                      <tr
                        key={member.adminUserId}
                        className="border-t border-border hover:bg-table-row-hover"
                      >
                        <td className="px-4 py-3 text-small text-text-secondary">
                          {member.index + 1}
                          {isNext ? (
                            <Badge variant="info" className="ml-2">
                              下一位
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-small font-medium text-foreground">
                            {member.name ?? '—'}
                          </span>
                          <div className="text-caption text-text-muted">{member.email}</div>
                        </td>
                        <td className="px-4 py-3 text-small text-text-secondary">
                          {member.assignedTotal}
                        </td>
                        <td className="px-4 py-3">
                          {member.isActive ? (
                            <Badge variant="success">启用</Badge>
                          ) : (
                            <Badge variant="destructive">已停用</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {planItem ? (
                            <Badge variant="warning">
                              倾斜中 {planItem.assignedCount}/{planItem.targetCount}
                            </Badge>
                          ) : (
                            <span className="text-caption text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 近 7 日分配量 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">近 7 日分配量</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyStatsChart stats={state.dailyStats} />
        </CardContent>
      </Card>

      {/* 最近分配 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">最近分配</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/lead-distribution/history">查看全部分配</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.recentAssignments.length === 0 ? (
            <p className="py-6 text-center text-small text-text-secondary">暂无分配记录</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-table-header">
                  <tr className="text-caption text-text-secondary">
                    <th className="px-4 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 font-medium">询盘</th>
                    <th className="px-4 py-3 font-medium">承接人</th>
                    <th className="px-4 py-3 font-medium">来源</th>
                  </tr>
                </thead>
                <tbody>
                  {state.recentAssignments.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-table-row-hover">
                      <td className="whitespace-nowrap px-4 py-3 text-small text-text-secondary">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-small text-foreground">{item.rfqSummary.name}</span>
                        <div className="text-caption text-text-muted">
                          {item.rfqSummary.company} · {item.rfqSummary.country}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-small text-text-secondary">
                        {item.assignee.name ?? item.assignee.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.source === 'PRIORITY_PLAN' ? 'warning' : 'outline'}>
                          {SOURCE_LABELS[item.source]}
                          {item.planName ? ` · ${item.planName}` : ''}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

/* ------------------------------ 局部组件 ------------------------------ */

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-5">
        <span className="text-caption text-text-muted">{label}</span>
        <span className="text-heading-sm font-semibold text-foreground">{value}</span>
        {hint ? <span className="text-caption text-text-muted">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

/** 生效中倾斜计划的摘要卡（详细进度在「查看倾斜计划」弹窗与详情页） */
function ActivePlanSummary({ plan }: { plan: Plan }) {
  return (
    <Card className="mt-6 border-warning-600/40">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">倾斜计划</Badge>
            <span className="text-body font-semibold text-foreground">{plan.name}</span>
            <Badge variant={plan.isInEffect ? 'success' : 'outline'}>
              {PLAN_STATUS_LABELS[plan.status]}
              {plan.isPendingStart ? ' · 待生效' : ''}
              {plan.isPendingResume ? ' · 冷却暂停' : ''}
            </Badge>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/lead-distribution/${plan.id}`}>计划详情</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <span className="text-small text-text-secondary">
            已分配{' '}
            <span className="font-medium text-foreground">
              {plan.totalAssigned}/{plan.totalTarget}
            </span>{' '}
            单
          </span>
          <span className="text-small text-text-secondary">
            完成度 <span className="font-medium text-foreground">{plan.completionPercent}%</span>
          </span>
          <span className="text-small text-text-secondary">
            生效时间 {formatDateTime(plan.startAt)}
            {plan.endAt ? ` 至 ${formatDateTime(plan.endAt)}` : ' · 无截止时间'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** 近 7 日分配量（后端每日计数，直接渲染） */
function DailyStatsChart({ stats }: { stats: LeadDistributionState['dailyStats'] }) {
  const max = Math.max(1, ...stats.map((item) => item.count));
  return (
    <ul className="flex flex-col gap-2">
      {stats.map((item) => (
        <li key={item.date} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-caption text-text-muted">{item.date}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-small text-text-secondary">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 列表行复用类型导出（保持与其它列表页一致） */
export type { Assignment };
