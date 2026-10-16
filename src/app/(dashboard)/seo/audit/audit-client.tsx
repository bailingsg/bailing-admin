'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { runAuditAction } from './actions';

/**
 * 审计运行按钮 + 结果展示（Phase 5.0）。
 * 审计为只读全站检查：Critical / Error / Warning / Passed 分级，
 * 点击问题可进入对应实体的 SEO 编辑页。
 */

export interface AuditIssueView {
  severity: 'critical' | 'error' | 'warning' | 'passed';
  check: string;
  title: string;
  entityType: string | null;
  entityId: string | null;
  routePath: string | null;
  entityName: string | null;
  message: string;
  suggestion: string;
}

export interface AuditResultView {
  id: string;
  summary: { total: number; passed: number; warnings: number; errors: number; critical: number };
  issues: AuditIssueView[];
  durationMs: number;
  createdAt: string;
}

const SEVERITY_META: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'border-red-300 bg-red-100 text-red-800' },
  error: { label: 'Error', className: 'border-red-200 bg-red-50 text-red-700' },
  warning: { label: 'Warning', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  passed: { label: 'Passed', className: 'border-green-200 bg-green-50 text-green-700' },
};

export function RunAuditButton() {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onRun() {
    setRunning(true);
    setError(null);
    const result = await runAuditAction();
    setRunning(false);
    if (!result.ok) {
      setError(result.error ?? '审计执行失败');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={onRun} disabled={running}>
        {running ? '审计运行中…' : 'Run Audit（全站只读检查）'}
      </Button>
      {error ? <p className="text-caption text-red-700">{error}</p> : null}
    </div>
  );
}

export function AuditResultView({ result }: { result: AuditResultView | null }) {
  if (!result) {
    return (
      <p className="text-small text-text-secondary">
        尚未运行过审计。点击「Run Audit」对全站进行只读检查（不会修改任何内容）。
      </p>
    );
  }

  const { summary, issues } = result;
  const problemIssues = issues.filter((issue) => issue.severity !== 'passed');
  const grouped = {
    critical: problemIssues.filter((i) => i.severity === 'critical'),
    error: problemIssues.filter((i) => i.severity === 'error'),
    warning: problemIssues.filter((i) => i.severity === 'warning'),
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 汇总 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile label="检查总数" value={summary.total} />
        <SummaryTile label="Passed" value={summary.passed} tone="good" />
        <SummaryTile label="Warnings" value={summary.warnings} tone="warn" />
        <SummaryTile label="Errors" value={summary.errors} tone="bad" />
        <SummaryTile label="Critical" value={summary.critical} tone="bad" />
      </div>
      <p className="text-caption text-text-muted">
        运行于 {new Date(result.createdAt).toLocaleString('zh-CN')} · 耗时 {result.durationMs}ms · 审计为只读操作，
        修复请在对应实体的 SEO 编辑页使用「快捷修复」（仅填补空缺，修改前展示 diff）。
      </p>

      {/* 问题明细（按严重级分组） */}
      {problemIssues.length === 0 ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <p className="text-small font-medium text-green-700">未发现 SEO 问题。</p>
        </div>
      ) : (
        (['critical', 'error', 'warning'] as const).map((severity) =>
          grouped[severity].length > 0 ? (
            <section key={severity} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-small font-medium text-foreground">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-caption',
                    SEVERITY_META[severity].className,
                  )}
                >
                  {SEVERITY_META[severity].label} · {grouped[severity].length}
                </span>
              </h3>
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {grouped[severity].map((issue, index) => (
                  <li key={`${issue.check}-${index}`} className="flex flex-col gap-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-small font-medium text-foreground">{issue.title}</span>
                      {issue.entityType && issue.entityId ? (
                        <Link
                          href={`/seo/${issue.entityType}/${encodeURIComponent(issue.entityId)}`}
                          className="text-caption text-primary hover:underline"
                        >
                          {issue.entityName ?? issue.routePath ?? '前往编辑'}
                        </Link>
                      ) : issue.routePath ? (
                        <code className="text-caption text-text-muted">{issue.routePath}</code>
                      ) : null}
                    </div>
                    <p className="text-small text-text-secondary">{issue.message}</p>
                    <p className="text-caption text-text-muted">建议：{issue.suggestion}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-green-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : tone === 'bad'
          ? 'text-red-700'
          : 'text-foreground';
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-caption text-text-secondary">{label}</p>
      <p className={cn('text-heading-sm font-semibold tabular-nums', toneClass)}>{value}</p>
    </div>
  );
}
