import { cn } from '@/lib/utils';
import type { SeoStatus } from '@/lib/seo';

/**
 * SeoScoreBadge —— SEO 分数徽章（Phase 5.0，任务书十二节评分档位）
 *
 * 90–100 优秀 / 50–89 待改进 / 0–49 差；null = 未审计。
 * 评分规则透明可解释（见后端 seo-score.ts），管理员可在编辑页查看检查明细。
 */
export function SeoScoreBadge({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  if (score === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-caption text-text-muted',
          className,
        )}
      >
        未审计
      </span>
    );
  }

  const tone =
    score >= 90
      ? 'border-green-200 bg-green-50 text-green-700'
      : score >= 50
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-red-200 bg-red-50 text-red-700';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-medium tabular-nums',
        tone,
        className,
      )}
      title={scoreLabel(score)}
    >
      {score}
    </span>
  );
}

export function scoreLabel(score: number): string {
  if (score >= 90) return '优秀（90–100）';
  if (score >= 50) return '待改进（50–89）';
  return '差（0–49）';
}

/** SEO 状态徽章（审计 / 列表用） */
export function SeoStatusBadge({ status }: { status: SeoStatus | string }) {
  const map: Record<string, string> = {
    GOOD: 'border-green-200 bg-green-50 text-green-700',
    NEEDS_IMPROVEMENT: 'border-amber-200 bg-amber-50 text-amber-700',
    POOR: 'border-red-200 bg-red-50 text-red-700',
    UNAUDITED: 'border-border bg-muted text-text-muted',
  };
  const labels: Record<string, string> = {
    GOOD: '优秀',
    NEEDS_IMPROVEMENT: '待改进',
    POOR: '差',
    UNAUDITED: '未审计',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-caption',
        map[status] ?? map.UNAUDITED,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

/** Index / Follow 徽章 */
export function RobotsBadge({ index, follow }: { index: boolean; follow: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-caption',
          index
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700',
        )}
      >
        {index ? 'Index' : 'Noindex'}
      </span>
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-caption',
          follow
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700',
        )}
      >
        {follow ? 'Follow' : 'Nofollow'}
      </span>
    </span>
  );
}
