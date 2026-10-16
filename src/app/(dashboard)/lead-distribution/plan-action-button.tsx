'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Assignment, Plan } from '@/lib/lead-distribution';
import { CreatePlanModal } from './create-plan-modal';
import { PlanProgressModal } from './plan-progress-modal';

/**
 * 询盘分配页主操作按钮（Phase 4.6）。
 *
 * 按钮行为按状态切换（规格硬性要求）：
 *   · 无生效计划 → 「创建倾斜计划」，打开创建弹窗
 *   · 有生效计划 → 「查看倾斜计划」，只打开查看弹窗，**绝不新建计划**
 *
 * 权限：
 *   · lead_distribution.manage 才有「创建」入口（无权限时仅提示，不渲染按钮）
 *   · 「查看」对具备 read 权限的账号始终可用（页面本身已由后端权限控制）
 *   · 手动关闭按钮由 lead_distribution.close 控制，在查看弹窗内部判定
 */
export function PlanActionButton({
  plan,
  recentAssignments,
  canManage,
  canClose,
}: {
  plan: Plan | null;
  recentAssignments: Assignment[];
  canManage: boolean;
  canClose: boolean;
}) {
  const [modal, setModal] = React.useState<'none' | 'create' | 'view'>('none');

  if (plan) {
    return (
      <>
        <Button type="button" variant="secondary" size="sm" onClick={() => setModal('view')}>
          查看倾斜计划
        </Button>
        <PlanProgressModal
          open={modal === 'view'}
          plan={plan}
          assignments={recentAssignments}
          canClose={canClose}
          onClose={() => setModal('none')}
        />
      </>
    );
  }

  if (!canManage) {
    return (
      <Badge variant="outline" title="需要 lead_distribution.manage 权限">
        无生效计划
      </Badge>
    );
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setModal('create')}>
        创建倾斜计划
      </Button>
      <CreatePlanModal open={modal === 'create'} onClose={() => setModal('none')} />
    </>
  );
}
