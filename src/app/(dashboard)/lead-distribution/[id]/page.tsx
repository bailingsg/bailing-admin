import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/modal';
import { formatDateTime } from '@/lib/format';
import { getCurrentAdmin, hasPermission, type AdminProfile } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { getPlan, listPlanLogs, PLAN_STATUS_LABELS } from '@/lib/lead-distribution';
import { PlanActions } from './plan-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '倾斜计划详情',
  description: '倾斜计划的执行进度、人员目标完成情况与操作日志。',
};

/** 计划详情（Phase 4.6）：进度与日志全部来自后端真实数据 */
export default async function LeadDistributionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getSessionToken();
  const [planResult, logsResult, adminResult] = await Promise.all([
    getPlan(token, id),
    listPlanLogs(token, id),
    getCurrentAdmin(token),
  ]);

  const admin: AdminProfile | null = adminResult.ok ? adminResult.data : null;

  if (!planResult.ok) {
    if (planResult.status === 404) notFound();
    return (
      <Container width="page" className="py-8">
        <PageHeader title="倾斜计划详情" description="倾斜计划的执行进度与操作日志。" />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载计划详情</p>
            <p className="text-small text-text-secondary">{planResult.error}</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const plan = planResult.data;
  const logs = logsResult.ok ? logsResult.data : [];

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={plan.name}
        description="倾斜计划执行进度。目标数量全部达成后计划自动完成；也可随时手动关闭。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/lead-distribution">返回分配总览</Link>
            </Button>
            <PlanActions plan={plan} canClose={hasPermission(admin, 'lead_distribution.close')} />
          </div>
        }
      />

      {/* 状态与概览 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={plan.status === 'ACTIVE' ? 'success' : plan.status === 'COMPLETED' ? 'info' : 'muted'}>
              {PLAN_STATUS_LABELS[plan.status]}
              {plan.isPendingStart ? ' · 待生效' : ''}
              {plan.isPendingResume ? ' · 冷却暂停' : ''}
            </Badge>
            {plan.isInEffect ? <Badge variant="warning">当前分配模式：倾斜计划</Badge> : null}
            <span className="text-caption text-text-muted">
              创建人 {plan.createdByEmail ?? '—'} · {formatDateTime(plan.createdAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-caption text-text-muted">生效时间</p>
              <p className="text-small text-foreground">
                {formatDateTime(plan.startAt)}
                {plan.endAt ? ` 至 ${formatDateTime(plan.endAt)}` : ' · 无截止时间'}
              </p>
            </div>
            <div>
              <p className="text-caption text-text-muted">整体进度</p>
              <ProgressBar
                percent={plan.completionPercent}
                label="计划整体完成度"
                tone={plan.completionPercent >= 100 ? 'success' : 'primary'}
              />
            </div>
            <div>
              <p className="text-caption text-text-muted">已分配 / 目标</p>
              <p className="text-small text-foreground">
                {plan.totalAssigned} / {plan.totalTarget} 单
              </p>
            </div>
            <div>
              <p className="text-caption text-text-muted">冷却设置</p>
              <p className="text-small text-foreground">
                {plan.cooldownSeconds > 0
                  ? `关闭后 ${plan.cooldownSeconds} 秒自动恢复`
                  : '关闭后仅可手动恢复'}
              </p>
            </div>
          </div>

          {plan.closedByEmail ? (
            <p className="text-small text-text-secondary">
              关闭人 {plan.closedByEmail}
              {plan.closedAt ? ` · ${formatDateTime(plan.closedAt)}` : ''}
              {plan.resumeAt ? ` · 预计恢复 ${formatDateTime(plan.resumeAt)}` : ''}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* 人员进度 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">人员目标完成情况</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <thead className="bg-table-header">
                <tr className="text-caption text-text-secondary">
                  <th className="px-4 py-3 font-medium">顺序</th>
                  <th className="px-4 py-3 font-medium">员工</th>
                  <th className="px-4 py-3 font-medium">职位</th>
                  <th className="px-4 py-3 font-medium">目标</th>
                  <th className="px-4 py-3 font-medium">已分配</th>
                  <th className="px-4 py-3 font-medium">剩余</th>
                  <th className="px-4 py-3 font-medium">完成度</th>
                  <th className="px-4 py-3 font-medium">账号状态</th>
                </tr>
              </thead>
              <tbody>
                {plan.items.map((item) => (
                  <tr key={item.adminUserId} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3 text-small text-text-secondary">{item.sortOrder + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-small font-medium text-foreground">{item.name ?? '—'}</span>
                      <div className="text-caption text-text-muted">{item.email}</div>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.targetCount}</td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.assignedCount}</td>
                    <td className="px-4 py-3 text-small text-text-secondary">{item.remainingCount}</td>
                    <td className="px-4 py-3">
                      <ProgressBar
                        percent={item.completionPercent}
                        label={`${item.name ?? item.email} 完成度`}
                        tone={item.completionPercent >= 100 ? 'success' : 'primary'}
                      />
                    </td>
                    <td className="px-4 py-3">
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
        </CardContent>
      </Card>

      {/* 操作日志 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">操作日志</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-4 text-small text-text-secondary">暂无操作日志</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-small font-medium text-foreground">
                      {log.summary ?? log.action}
                    </span>
                    <span className="text-caption text-text-muted">{log.action}</span>
                  </div>
                  <span className="text-caption text-text-muted">
                    {log.actorEmail ?? '系统'} · {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
