import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/session';
import { getSeoOverview } from '@/lib/seo';
import { SeoNav } from './seo-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SEO Overview',
  description: '全站 SEO 状态总览与健康评分。',
};

/**
 * SEO Overview Dashboard（Phase 5.0，任务书十二节）
 *
 * 展示：总体状态卡片（总数 / 收录 / noindex / 缺失项）+ 分数分布 + 按类型汇总 +
 * 最近一次审计结果入口。评分可解释：点击任一列表进入编辑页查看检查明细。
 */
export default async function SeoOverviewPage() {
  const token = await getSessionToken();
  const result = await getSeoOverview(token);

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title="SEO 管理中心"
        description="全站 SEO 基础设施：页面 / 产品 / 博客元数据、Canonical、Open Graph、结构化数据、Sitemap、Robots、重定向与健康审计。"
      />
      <div className="mt-6">
        <SeoNav />
      </div>

      {!result.ok ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载 SEO 总览</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              请确认后端服务已启动（默认 4000 端口）且数据库可用。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {/* 总体状态 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="可管理实体" value={result.data.totalEntities} />
            <StatCard label="允许收录" value={result.data.indexedEntities} tone="good" />
            <StatCard label="Noindex" value={result.data.noindexEntities} tone={result.data.noindexEntities > 0 ? 'warn' : undefined} />
            <StatCard label="缺失 Meta Title" value={result.data.missingMetaTitle} tone={result.data.missingMetaTitle > 0 ? 'bad' : 'good'} />
            <StatCard label="缺失 Meta Description" value={result.data.missingMetaDescription} tone={result.data.missingMetaDescription > 0 ? 'bad' : 'good'} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="缺失 Canonical" value={result.data.missingCanonical} tone={result.data.missingCanonical > 0 ? 'warn' : 'good'} hint="为空时前台自动导出" />
            <StatCard label="缺失 OG 图" value={result.data.missingOgImage} tone={result.data.missingOgImage > 0 ? 'warn' : 'good'} />
            <StatCard label="图片缺失 Alt" value={result.data.missingAltImages} tone={result.data.missingAltImages > 0 ? 'bad' : 'good'} hint={`媒体库共 ${result.data.totalImages} 张图片`} />
            <StatCard
              label="最近审计问题"
              value={result.data.latestAudit ? result.data.latestAudit.summary.errors + result.data.latestAudit.summary.critical + result.data.latestAudit.summary.warnings : 0}
              tone={result.data.latestAudit && result.data.latestAudit.summary.errors + result.data.latestAudit.summary.critical > 0 ? 'bad' : undefined}
            />
            <StatCard
              label="Critical 问题"
              value={result.data.latestAudit?.summary.critical ?? 0}
              tone={(result.data.latestAudit?.summary.critical ?? 0) > 0 ? 'bad' : 'good'}
            />
          </div>

          {/* 分数分布 */}
          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <h2 className="text-small font-medium text-foreground">SEO 分数分布（满分 100，可解释评分）</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ScoreBucket label="优秀 90–100" value={result.data.scoreDistribution.good} tone="good" />
                <ScoreBucket label="待改进 50–89" value={result.data.scoreDistribution.needsImprovement} tone="warn" />
                <ScoreBucket label="差 0–49" value={result.data.scoreDistribution.poor} tone="bad" />
                <ScoreBucket label="未审计" value={result.data.scoreDistribution.unaudited} />
              </div>
              <p className="text-caption text-text-muted">
                评分由 12 项固定检查加权得出（标题 / 描述 / Canonical / OG / 收录设置 / 关键词 / Schema / Alt 覆盖率 / 内容深度 / 内链…）。
                进入任一实体编辑页可看到「为什么是这个分数」的逐项明细。
              </p>
            </CardContent>
          </Card>

          {/* 按类型汇总 */}
          <Card>
            <CardContent className="flex flex-col gap-3 py-5">
              <h2 className="text-small font-medium text-foreground">按内容类型</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {result.data.byType.map((row) => (
                  <div key={row.entityType} className="rounded-md border border-border p-3">
                    <p className="text-small font-medium text-foreground">{row.label}</p>
                    <p className="mt-1 text-caption text-text-secondary">
                      共 {row.total} 项 · 缺标题 {row.missingTitle}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近审计 */}
          <Card>
            <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-small font-medium text-foreground">最近一次 SEO 审计</h2>
                {result.data.latestAudit ? (
                  <p className="mt-1 text-small text-text-secondary">
                    {new Date(result.data.latestAudit.createdAt).toLocaleString('zh-CN')} · 通过{' '}
                    {result.data.latestAudit.summary.passed} · 警告 {result.data.latestAudit.summary.warnings} · 错误{' '}
                    {result.data.latestAudit.summary.errors} · Critical {result.data.latestAudit.summary.critical}
                  </p>
                ) : (
                  <p className="mt-1 text-small text-text-secondary">尚未运行过审计。审计为只读检查，不会修改任何内容。</p>
                )}
              </div>
              <Button asChild>
                <Link href="/seo/audit">前往 SEO Audit</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </Container>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: 'good' | 'warn' | 'bad';
  hint?: string;
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
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-caption text-text-secondary">{label}</span>
        <span className={`text-heading-md font-semibold tabular-nums ${toneClass}`}>{value}</span>
        {hint ? <span className="text-caption text-text-muted">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

function ScoreBucket({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' | 'bad' }) {
  const toneClass =
    tone === 'good'
      ? 'border-green-200 bg-green-50 text-green-700'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'bad'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-border bg-muted text-text-secondary';
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <p className="text-caption">{label}</p>
      <p className="mt-1 text-heading-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
