import Link from 'next/link';
import { BackendStatusCard, type BackendCheckResult } from '@/components/backend-status-card';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

/**
 * 管理后台入口页（概览）。
 * 服务端直连后端 /api/v1/health/ready 展示真实连接状态。
 * 登录鉴权与各业务管理模块尚未开发，页面中明确标注"未实现"，不做虚假演示。
 */
async function checkBackend(): Promise<BackendCheckResult> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  const started = Date.now();
  try {
    const res = await fetch(`${base}/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const latencyMs = Date.now() - started;
    const json = (await res.json().catch(() => null)) as {
      data?: { checks?: { database?: boolean } };
    } | null;
    const databaseUp = json?.data?.checks?.database ?? null;
    return {
      reachable: res.ok,
      httpStatus: res.status,
      latencyMs,
      databaseUp,
      message: res.ok ? '后端服务就绪' : '后端在线但未就绪',
    };
  } catch {
    return {
      reachable: false,
      httpStatus: null,
      latencyMs: Date.now() - started,
      databaseUp: null,
      message: '无法连接后端服务',
    };
  }
}

const PLANNED_MODULES = [
  { id: 'products', title: '产品管理', desc: '产品与分类的新增、编辑、上下架' },
  { id: 'inquiries', title: '询盘管理', desc: '询盘列表、状态跟进与导出' },
  { id: 'content', title: '内容管理', desc: '博客文章与媒体资源管理' },
];

export default async function AdminHomePage() {
  const backend = await checkBackend();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="管理后台概览"
        description="Phase 3.2 · UI 设计系统与工程基础。登录鉴权与业务模块尚未开发。"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/design-system">查看设计系统</Link>
          </Button>
        }
      />

      <Container width="page" className="py-6 sm:py-8">
        <section aria-labelledby="system-status" className="mb-8">
          <h2 id="system-status" className="mb-3 text-heading-sm">
            系统状态
          </h2>
          <BackendStatusCard backend={backend} />
        </section>

        <section aria-labelledby="modules">
          <h2 id="modules" className="mb-3 text-heading-sm">
            功能模块
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANNED_MODULES.map((mod) => (
              <Card key={mod.id} id={mod.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{mod.title}</CardTitle>
                    <Badge variant="muted">未实现</Badge>
                  </div>
                  <CardDescription>{mod.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-caption text-text-muted">
                    规划于 Phase 3.3 及之后实现；本阶段仅提供 UI 基础组件。
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
