import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCmsStats, type CmsStats } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard',
 description: '百灵木业 CMS 后台概览：询盘与内容真实统计。',
};

/** 单个统计卡片 */
function StatCard({
  label,
  value,
  hint,
  badge,
}: {
  label: string;
  value: number;
  hint?: string;
  badge?: ReactNode;
}) {
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

/** RFQ 状态分布行 */
function StatusRow({ label, count, variant }: { label: string; count: number; variant: BadgeProps['variant'] }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-small text-foreground">
        <Badge variant={variant}>{label}</Badge>
      </span>
      <span className="text-small font-medium tabular-nums text-foreground">{count}</span>
    </li>
  );
}

/**
 * Dashboard 首页。
 *
 * 数据全部来自后端 GET /api/v1/cms/stats（JWT 保护）的**真实计数**：
 * 不展示任何虚构数字（如 1000 customers / 500 products）。
 */
export default async function DashboardPage() {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const result = await getCmsStats(token);

  // 令牌失效（被后端拒绝）→ 回登录页
  if (!result.ok && result.status === 401) redirect('/login');

  let stats: CmsStats | null = null;
  let errorMessage: string | null = null;
  if (result.ok) {
    stats = result.data;
  } else {
    errorMessage = result.error;
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="询盘与内容管理概览。数据来自后端实时统计，无演示数字。"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/rfq">前往询盘管理</Link>
          </Button>
        }
      />

      <Container width="page" className="py-6 sm:py-8">
        {errorMessage ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>无法加载统计数据</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-caption text-text-muted">
                请确认后端服务已启动（默认 4000 端口）、数据库可用，且登录会话仍然有效。
                页面会在下次刷新时重新获取。
              </p>
            </CardContent>
          </Card>
        ) : null}

        {stats ? (
          <>
            <section aria-labelledby="stat-heading" className="mb-8">
              <h2 id="stat-heading" className="mb-3 text-heading-sm">
                业务概览
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="RFQ 询盘总数"
                  value={stats.rfq.total}
                  hint="官网提交的全部询价请求"
                />
                <StatCard
                  label="新询盘（待跟进）"
                  value={stats.rfq.byStatus.NEW}
                  hint="状态为 NEW、尚未联系的询盘"
                  badge={<Badge variant="warning">待处理</Badge>}
                />
                <StatCard
                  label="产品"
                  value={stats.products.total}
                  hint={`已发布 ${stats.products.published} · 草稿 ${stats.products.draft}`}
                />
                <StatCard
                  label="博客文章"
                  value={stats.blogPosts.total}
                  hint={`已发布 ${stats.blogPosts.published} · 草稿 ${stats.blogPosts.draft}`}
                />
              </div>
            </section>

            <section aria-labelledby="breakdown-heading">
              <h2 id="breakdown-heading" className="mb-3 text-heading-sm">
                询盘状态分布
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>按跟进状态</CardTitle>
                    <CardDescription>与询盘管理页的状态一一对应</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-border">
                      <StatusRow label="新询盘 NEW" count={stats.rfq.byStatus.NEW} variant="warning" />
                      <StatusRow label="已联系 CONTACTED" count={stats.rfq.byStatus.CONTACTED} variant="info" />
                      <StatusRow label="已报价 QUOTED" count={stats.rfq.byStatus.QUOTED} variant="success" />
                      <StatusRow label="已关闭 CLOSED" count={stats.rfq.byStatus.CLOSED} variant="muted" />
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>内容资产</CardTitle>
                    <CardDescription>CMS 模块接入前的真实存量</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-border">
                      <li className="flex items-center justify-between gap-3 py-2">
                        <span className="text-small text-foreground">产品分类</span>
                        <span className="text-small font-medium tabular-nums text-foreground">
                          {stats.categories}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-3 py-2">
                        <span className="text-small text-foreground">产品（已发布）</span>
                        <span className="text-small font-medium tabular-nums text-foreground">
                          {stats.products.published}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-3 py-2">
                        <span className="text-small text-foreground">博客文章（已发布）</span>
                        <span className="text-small font-medium tabular-nums text-foreground">
                          {stats.blogPosts.published}
                        </span>
                      </li>
                    </ul>
                    <p className="mt-3 text-caption text-text-muted">
                      Products / Media / Blog 等 CMS 模块将在后续阶段开放，当前仅展示存量计数。
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        ) : null}
      </Container>
    </>
  );
}
