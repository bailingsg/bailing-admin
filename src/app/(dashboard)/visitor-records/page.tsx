import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VisitorTrendChart } from '@/components/visitor-trend-chart';
import { getCurrentAdmin, hasPermission } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import {
  getVisitorIps,
  getVisitorOverview,
  getVisitorTrend,
  type VisitorIpDays,
  type VisitorIpsResponse,
  type VisitorOverview,
  type VisitorTrend,
} from '@/lib/visitorStats';

/**
 * 访客记录页（2026-10-27 改版）。
 *
 * 改版原因：原页面只有「脱敏 IP 网段 + 国家 + 城市 + 时间」四列，看不到
 * 具体 IP、也看不出客户来自哪个国家（GeoIP 一直是 Noop 空实现）；而首页
 * Dashboard 又挂着一块访客概览 + 趋势图，两个地方各看一半。
 *
 * 现在合并为**一个独立页**，从上到下四段：
 *   ① 概览卡片（今日 / 7 日 / 30 日 UV·PV）
 *   ② 访问趋势图（7 / 30 天）
 *   ③ 国家分布（按访问次数降序，带占比条）
 *   ④ 近期访客 IP 明细（完整 IP + 国家 + 访问时间，分页）
 *
 * 权限分两层（不是冗余，是两个数据面）：
 *   · `visitor_stats.read`   → ① ② 聚合数字；
 *   · `visitor_records.read` → ③ ④ 明细，含完整 IP，seed 只授超管。
 * 两块**独立加载**：任一端点失败只让本区块显示错误卡，不影响另一块。
 * 🔴 前端不是安全边界，权威判定始终在后端 PermissionsGuard。
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '访客记录',
  description: '访客概览、访问趋势、国家分布与近期访客 IP 明细。',
};

/** 天数白名单（与后端 DTO 一致） */
const DAY_OPTIONS: VisitorIpDays[] = [7, 30];

/** UTC ISO → 展示用（UTC 直读，避免本地时区误导） */
function formatVisitedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default async function VisitorRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; page?: string }>;
}) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const adminResult = await getCurrentAdmin(token);
  const admin = adminResult.ok ? adminResult.data : null;
  const canSeeStats = hasPermission(admin, 'visitor_stats.read');
  const canSeeIps = hasPermission(admin, 'visitor_records.read');

  const params = await searchParams;
  const days: VisitorIpDays = params.days === '30' ? 30 : 7;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  return (
    <>
      <PageHeader
        title="访客记录"
        description="访客概览、访问趋势、国家分布与近期访客 IP 明细。数据为匿名流量，与账号 / 客户档案 / 订单无关联。"
      />

      <Container width="page" className="py-6 sm:py-8">
        {!canSeeStats && !canSeeIps ? (
          <Card className="border-dashed" data-testid="visitor-records-forbidden">
            <CardHeader>
              <CardTitle>仅管理员可访问本页</CardTitle>
              <CardDescription>访客数据属经营分析内容，仅对具备相应权限的账号开放。</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* 天数切换：统一控制趋势图 / 国家分布 / IP 明细，三处口径必须一致 */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-small text-text-muted">时间范围</span>
                {DAY_OPTIONS.map((d) => (
                  <Link
                    key={d}
                    href={`/visitor-records?days=${d}&page=1`}
                    data-testid={`visitor-records-days-${d}`}
                    aria-current={days === d ? 'true' : undefined}
                    className={
                      days === d
                        ? 'rounded-md bg-primary px-3 py-1 text-caption text-primary-foreground'
                        : 'rounded-md border border-border px-3 py-1 text-caption text-text-muted'
                    }
                  >
                    近 {d} 天
                  </Link>
                ))}
              </div>
              <span className="text-caption text-text-muted">统计时区 UTC · 会话窗口 30 分钟</span>
            </div>

            {canSeeStats ? <VisitorStatsSection token={token} days={days} /> : null}
            {canSeeIps ? <VisitorIpSection token={token} days={days} page={page} /> : null}
          </>
        )}
      </Container>
    </>
  );
}

/* ────────────────────────── ① 概览 + ② 趋势（visitor_stats.read） ────────────────────────── */

async function VisitorStatsSection({ token, days }: { token: string; days: VisitorIpDays }) {
  const [overviewResult, trendResult] = await Promise.all([
    getVisitorOverview(token),
    getVisitorTrend(token, days),
  ]);

  if (!overviewResult.ok || !trendResult.ok) {
    const failed = !overviewResult.ok ? overviewResult : trendResult;
    return (
      <Card className="mb-6 border-dashed">
        <CardHeader>
          <CardTitle>访客概览暂时不可用</CardTitle>
          <CardDescription>{failed.ok ? '加载失败' : failed.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-caption text-text-muted">
            下方 IP 明细不受影响；页面会在下次刷新时重新获取。
          </p>
        </CardContent>
      </Card>
    );
  }

  const overview: VisitorOverview = overviewResult.data;
  const trend: VisitorTrend = trendResult.data;

  return (
    <section aria-labelledby="visitor-stats-heading" className="mb-6" data-testid="visitor-overview">
      <h2 id="visitor-stats-heading" className="mb-3 text-heading-sm">
        访客概览
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="visitor-card-today-visitors">
          <StatCard
            label="今日访客"
            value={overview.today.uniqueVisitors}
            hint={`今日访问 ${overview.today.visits} 次`}
          />
        </div>
        <div data-testid="visitor-card-today-visits">
          <StatCard
            label="今日访问次数"
            value={overview.today.visits}
            hint={`新访客 ${overview.today.newVisitors}`}
          />
        </div>
        <div data-testid="visitor-card-last-7-visitors">
          <StatCard
            label="7 日访客"
            value={overview.last7Days.uniqueVisitors}
            hint={`7 日访问 ${overview.last7Days.visits} 次`}
          />
        </div>
        <div data-testid="visitor-card-last-30-visitors">
          <StatCard
            label="30 日访客"
            value={overview.last30Days.uniqueVisitors}
            hint={`30 日访问 ${overview.last30Days.visits} 次`}
          />
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>访问趋势</CardTitle>
          <CardDescription>
            近 {days} 日 UV / PV。区间访客数为去重计数，不是逐日相加；缺失日期补 0，不做插值。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisitorTrendChart points={trend.points} />
        </CardContent>
      </Card>
    </section>
  );
}

/* ────────────────────────── ③ 国家分布 + ④ IP 明细（visitor_records.read） ────────────────────────── */

async function VisitorIpSection({
  token,
  days,
  page,
}: {
  token: string;
  days: VisitorIpDays;
  page: number;
}) {
  const result = await getVisitorIps(token, { days, page, pageSize: 50 });

  if (!result.ok) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>无法加载访客 IP 明细</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data: VisitorIpsResponse = result.data;
  const maxVisits = Math.max(1, ...data.countries.map((c) => c.visits));

  return (
    <>
      {/* ③ 国家分布 */}
      <section aria-labelledby="visitor-country-heading" className="mb-6" data-testid="visitor-countries">
        <h2 id="visitor-country-heading" className="mb-3 text-heading-sm">
          国家分布
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>近 {days} 天访客来源</CardTitle>
            <CardDescription>
              按访问次数降序；独立 IP 数为同一国家内不同 IP 的个数，不是访问次数。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.countries.length === 0 ? (
              <p className="py-6 text-center text-small text-text-muted">该周期内暂无访客数据</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.countries.map((c) => {
                  const ratio = Math.round((c.visits / maxVisits) * 100);
                  return (
                    <li
                      key={c.country ?? 'unknown'}
                      className="flex items-center gap-3 py-2.5"
                      data-testid={`visitor-country-${c.country ?? 'unknown'}`}
                    >
                      <span className="w-32 shrink-0 truncate text-small text-foreground">
                        {c.countryName ?? '未知'}
                        {c.country ? (
                          <span className="ml-1.5 font-mono text-caption text-text-muted">
                            {c.country}
                          </span>
                        ) : null}
                      </span>
                      {/* 占比条：宽度按访问次数相对最大值，纯装饰（数字在右侧） */}
                      <span className="hidden h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken sm:block">
                        <span
                          aria-hidden
                          className="block h-full rounded-full bg-primary/70"
                          style={{ width: `${ratio}%` }}
                        />
                      </span>
                      <span className="shrink-0 text-caption tabular-nums text-text-muted">
                        {c.visits} 次 · {c.uniqueIps} 个 IP
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ④ IP 明细 */}
      <section aria-labelledby="visitor-ip-heading" data-testid="visitor-ips">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="visitor-ip-heading" className="text-heading-sm">
            近期访客 IP
          </h2>
          <span className="text-caption text-text-muted" data-testid="visitor-ips-total">
            共 {data.total} 条记录
          </span>
        </div>

        <Card className="mb-4 border-dashed bg-surface-sunken">
          <CardContent className="py-3 text-caption text-text-muted">
            完整 IP 仅保留 30 天，过期由后台任务自动删除；本页只展示 IP、国家与访问时间，
            不关联账号 / 客户档案 / 订单。
            <br />
            国家解析不出来的访问（内网、保留网段、国家库未收录）<span className="text-foreground">不入库</span>，
            因此本表条数会少于上方「今日访客」——访客数统计的是全部访问，不受此限。
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-small" data-testid="visitor-ips-table">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-4 py-2 font-medium">IP 地址</th>
                  <th className="px-4 py-2 font-medium">国家 / 地区</th>
                  <th className="px-4 py-2 font-medium">访问时间（UTC）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-text-muted">
                      该周期内暂无访客记录
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-mono tabular-nums text-foreground">{item.ip}</td>
                      <td className="px-4 py-2 text-foreground">
                        {item.countryName ?? '未知'}
                        {item.country ? (
                          <span className="ml-1.5 font-mono text-caption text-text-muted">
                            {item.country}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-foreground">
                        {formatVisitedAt(item.visitedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {data.totalPages > 1 ? (
          <nav className="mt-4 flex items-center justify-between" aria-label="分页">
            <span className="text-small text-text-muted">
              第 {data.page} / {data.totalPages} 页
            </span>
            <div className="flex gap-2">
              {data.page > 1 ? (
                <Link
                  href={`/visitor-records?days=${days}&page=${data.page - 1}`}
                  data-testid="visitor-ips-prev"
                  className="rounded-md border border-border px-3 py-1 text-caption text-text-muted"
                >
                  上一页
                </Link>
              ) : null}
              {data.page < data.totalPages ? (
                <Link
                  href={`/visitor-records?days=${days}&page=${data.page + 1}`}
                  data-testid="visitor-ips-next"
                  className="rounded-md border border-border px-3 py-1 text-caption text-text-muted"
                >
                  下一页
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </>
  );
}
