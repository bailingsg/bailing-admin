import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

/**
 * 统计卡片（后台各页共用）。
 *
 * 从 dashboard/page.tsx 抽出：访客记录页与首页都要用同一套视觉，
 * 各写一份必然在字号 / 间距上漂移。
 *
 * 约束：value 一律 `tabular-nums`（数字等宽，纵向对齐不跳动）；
 * hint 只放**同一口径**的补充数字，不放解释性长文案（那属于页面说明）。
 */
export interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  badge?: ReactNode;
}

export function StatCard({ label, value, hint, badge }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          {badge}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-heading-lg font-semibold tabular-nums text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-caption text-text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
