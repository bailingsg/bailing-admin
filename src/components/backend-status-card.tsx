import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BackendCheckResult {
  reachable: boolean;
  httpStatus: number | null;
  latencyMs: number;
  databaseUp: boolean | null;
  message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

/** 后端连接状态卡片：管理后台服务端探测后端健康检查，展示真实结果 */
export function BackendStatusCard({ backend }: { backend: BackendCheckResult }) {
  const statusVariant = backend.reachable ? 'success' : 'destructive';

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>后端服务</CardTitle>
          <Badge variant={statusVariant}>{backend.reachable ? '已连接' : '未连接'}</Badge>
        </div>
        <code className="rounded bg-muted px-2 py-1 text-caption text-text-secondary">
          {API_BASE}
        </code>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-2 gap-4 text-small sm:grid-cols-4">
          <div>
            <dt className="text-caption text-text-muted">状态</dt>
            <dd className="mt-1 font-medium">{backend.message}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">HTTP 状态码</dt>
            <dd className="mt-1 font-medium">{backend.httpStatus ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">响应耗时</dt>
            <dd className="mt-1 font-medium">{backend.latencyMs} ms</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">数据库</dt>
            <dd className="mt-1 font-medium">
              {backend.databaseUp === null ? '未知' : backend.databaseUp ? '正常' : '离线'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-border pt-4 text-caption text-text-muted">
          <p className="font-medium text-text-secondary">健康检查端点</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              <code>GET /api/v1/health</code> — 服务存活检查
            </li>
            <li>
              <code>GET /api/v1/health/ready</code> — 就绪检查（含数据库状态）
            </li>
          </ul>
        </div>

        {!backend.reachable && (
          <p className="mt-4 rounded-md bg-muted p-3 text-caption text-text-secondary">
            后端或数据库未启动。请先运行数据库（bailing-backend：npm run db:up）与后端（npm run
            start:dev），详见后端仓库 README。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
