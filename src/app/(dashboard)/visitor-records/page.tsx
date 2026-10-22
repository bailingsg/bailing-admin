import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAdmin, hasPermission } from '@/lib/api';
import { getVisitorRecords, type VisitorRecordPeriod } from '@/lib/visitorStats';
import { getSessionToken } from '@/lib/session';

/**
 * 访客记录页（访客统计实现规格第 9 节）。
 *
 * 权限：visitor_records.read（seed 只授超级管理员，等价「仅 ADMIN」）。
 * 🔴 前端不是安全边界，但必须做对体验：无权限时**整页只渲染提示，
 * 且不发起任何请求**——否则 403 会被显示成「服务器错误」。
 * 权威判定始终在后端 PermissionsGuard。
 *
 * 表格只有 4 列：IP（网段）/ 国家 / 城市 / 访问时间。
 * 🔴 不加「访客 ID / UA / 地区 / 操作」列——加任何一列都意味着放宽隐私边界。
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '访客记录',
  description: '匿名访客会话明细（脱敏 IP 网段 + 国家 + 城市 + 访问时间）。',
};

const PERIODS: VisitorRecordPeriod[] = ['day', 'week', 'month'];
const PERIOD_LABELS: Record<VisitorRecordPeriod, string> = {
  day: '天',
  week: '周',
  month: '月',
};

/** UTC ISO → 展示用（UTC 直读，避免本地时区误导） */
function formatVisitedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default async function VisitorRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; page?: string }>;
}) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const admin = await getCurrentAdmin(token);
  const canSee = hasPermission(admin.ok ? admin.data : null, 'visitor_records.read');

  const params = await searchParams;
  const period: VisitorRecordPeriod = PERIODS.includes(params.period as VisitorRecordPeriod)
    ? (params.period as VisitorRecordPeriod)
    : 'day';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  return (
    <>
      <PageHeader title="访客记录" description="按天 / 周 / 月查看访客访问记录：脱敏 IP 网段、国家、城市、访问时间。" />

      <Container width="page" className="py-6 sm:py-8">
        {/* 权限提示：无权限时整页不发起请求（规格 9.2） */}
        {!canSee ? (
          <Card className="border-dashed" data-testid="visitor-records-forbidden">
            <CardHeader>
              <CardTitle>仅管理员可访问本页</CardTitle>
              <CardDescription>访客记录属经营分析数据，仅对超级管理员开放。</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <VisitorRecordsSection token={token} period={period} page={page} />
        )}
      </Container>
    </>
  );
}

/** 有权限时的数据区（服务端取数；失败只影响本区块） */
async function VisitorRecordsSection({
  token,
  period,
  page,
}: {
  token: string;
  period: VisitorRecordPeriod;
  page: number;
}) {
  const result = await getVisitorRecords(token, { period, page, pageSize: 20 });

  if (!result.ok) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>无法加载访客记录</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = result.data;
  const totalPages = data.totalPages;

  return (
    <>
      <Card className="mb-4 border-dashed bg-surface-sunken">
        <CardContent className="py-3 text-caption text-text-muted">
          ⚠ 本页展示的是脱敏后的 IP 网段（IPv4 保留前三段、IPv6 保留前三组），不是完整 IP——完整 IP
          不落库。记录为匿名流量，与登录账号 / 客户档案 / 订单无任何关联；列表按访问时间从晚到早排列。
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-small text-text-muted">查询周期</span>
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/visitor-records?period=${p}&page=1`}
              data-testid={`visitor-records-period-${p}`}
              aria-current={period === p ? 'true' : undefined}
              className={
                period === p
                  ? 'rounded-md bg-primary px-3 py-1 text-caption text-primary-foreground'
                  : 'rounded-md border border-border px-3 py-1 text-caption text-text-muted'
              }
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
        <span className="text-small text-text-muted" data-testid="visitor-records-total">
          共 {data.total} 条记录
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-small" data-testid="visitor-records-table">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-4 py-2 font-medium">IP（网段）</th>
                <th className="px-4 py-2 font-medium">国家</th>
                <th className="px-4 py-2 font-medium">城市</th>
                <th className="px-4 py-2 font-medium">访问时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                    该周期内暂无访客记录
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                      {item.maskedIp ?? '未知'}
                    </td>
                    <td className="px-4 py-2 text-foreground">{item.country ?? '未知'}</td>
                    <td className="px-4 py-2 text-foreground">{item.city ?? '未知'}</td>
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

      <div className="mt-3 text-caption text-text-muted">
        时间按 UTC 计算；「天」= 当日 00:00–23:59，「周」= 本周一 00:00 起，「月」= 本月 1 日 00:00
        起。国家 / 城市为离线 GeoIP 解析结果，未收录时显示「未知」。
      </div>

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between" aria-label="分页">
          <span className="text-small text-text-muted">
            第 {data.page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={`/visitor-records?period=${period}&page=${data.page - 1}`}
                data-testid="visitor-records-prev"
                className="rounded-md border border-border px-3 py-1 text-caption text-text-muted"
              >
                上一页
              </Link>
            ) : null}
            {data.page < totalPages ? (
              <Link
                href={`/visitor-records?period=${period}&page=${data.page + 1}`}
                data-testid="visitor-records-next"
                className="rounded-md border border-border px-3 py-1 text-caption text-text-muted"
              >
                下一页
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
