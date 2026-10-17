import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionToken } from '@/lib/session';
import {
  PUBLISHABLE_LABELS,
  getContentPreview,
  getContentRevisions,
  isPublishableKind,
  type ContentPreview,
  type ContentRevision,
} from '@/lib/publishing';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '内容预览',
  description: '对照查看线上版本与未发布的编辑稿。',
};

/**
 * 通用预览页（Phase 1）。
 *
 * 路由：/preview/<kind>/<id>，kind 为后端控制器路径片段
 * （products / blog/posts / factory / quality / applications / site/sections）。
 *
 * 语义：
 *   · 左侧是**线上版本**（公开站此刻看到的内容）
 *   · 右侧是**编辑稿**（尚未发布，公开站看不到）
 *   · 顶部列出两者不一致的字段，便于发布前核对
 *   · 只有持有该模块 read 权限的后台账号能访问（后端 preview 接口鉴权）
 */
export default async function ContentPreviewPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const id = slug[slug.length - 1] ?? '';
  const kind = slug.slice(0, -1).join('/');

  if (!id || !isPublishableKind(kind)) notFound();

  const token = await getSessionToken();
  const [result, revisions] = await Promise.all([
    getContentPreview<Record<string, unknown>>(token, kind, id),
    getContentRevisions(token, kind, id),
  ]);

  if (!result.ok) {
    return (
      <Container width="page" className="py-8">
        <PageHeader title="内容预览" />
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-body font-medium text-foreground">无法加载预览</p>
            <p className="text-small text-text-secondary">{result.error}</p>
            <p className="text-caption text-text-muted">
              预览需要该模块的读取权限；若无权限请联系管理员。
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const preview = result.data as ContentPreview<Record<string, unknown>>;
  const changed = diffKeys(preview.entity, preview.draft);
  const label = PUBLISHABLE_LABELS[kind];
  const history: ContentRevision[] = revisions.ok && Array.isArray(revisions.data) ? revisions.data : [];

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`预览：${label}`}
        description="左侧是公开站此刻的线上版本，右侧是尚未发布的编辑稿。"
        breadcrumb={
          <Link href={`/${kind.split('/')[0]}`} className="hover:text-foreground">
            返回列表
          </Link>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${kind.split('/')[0]}`}>返回列表</Link>
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant={preview.status === 'PUBLISHED' ? 'success' : 'muted'}>
          {preview.status === 'PUBLISHED' ? '已发布' : '未上线'}
        </Badge>
        <span className="text-caption text-text-secondary">
          线上版本 v{preview.publishedVersion}
          {preview.draftVersion ? ` · 编辑稿 v${preview.draftVersion}` : ' · 无编辑稿'}
        </span>
        {preview.hasUnpublishedChanges ? <Badge variant="warning">有未发布的修改</Badge> : null}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>字段差异</CardTitle>
        </CardHeader>
        <CardContent>
          {changed.length === 0 ? (
            <p className="text-small text-text-secondary">
              线上版本与编辑稿内容一致（或当前没有编辑稿）。
            </p>
          ) : (
            <p className="text-small text-text-secondary">
              以下字段与线上版本不同：
              <span className="ml-1 font-mono text-foreground">{changed.join('、')}</span>
            </p>
          )}
          <p className="mt-2 text-caption text-text-muted">
            左侧为公开 DTO（含关联对象），右侧为编辑稿的 Update DTO 快照，字段命名不完全相同
            （如 coverMedia 与 coverMediaId），因此差异列表可能包含「等价字段」。
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>线上版本（公开站可见）</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[36rem] overflow-auto rounded-md bg-table-header p-3 text-caption leading-relaxed text-foreground">
              {JSON.stringify(preview.entity, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>编辑稿（未发布）</CardTitle>
          </CardHeader>
          <CardContent>
            {preview.draft ? (
              <pre className="max-h-[36rem] overflow-auto rounded-md bg-table-header p-3 text-caption leading-relaxed text-foreground">
                {JSON.stringify(preview.draft, null, 2)}
              </pre>
            ) : (
              <p className="text-small text-text-secondary">
                没有编辑稿：当前保存的内容就是线上版本。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>发布历史（最近 {history.length} 个版本）</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-small text-text-secondary">
              尚无发布记录：该{label}从未上线过，或历史已被清理。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-small">
                <thead>
                  <tr className="border-b border-border text-left text-caption text-text-secondary">
                    <th className="py-2 pr-4 font-medium">版本</th>
                    <th className="py-2 pr-4 font-medium">动作</th>
                    <th className="py-2 pr-4 font-medium">时间</th>
                    <th className="py-2 pr-4 font-medium">操作人</th>
                    <th className="py-2 pr-4 font-medium">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((rev) => (
                    <tr key={rev.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-mono">v{rev.version}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={rev.action === 'PUBLISH' ? 'success' : 'warning'}>
                          {rev.action === 'PUBLISH' ? '发布' : '取消发布'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {new Date(rev.publishedAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-2 pr-4 font-mono text-caption text-text-secondary">
                        {rev.publishedById ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{rev.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-caption text-text-muted">
            每次发布都会保留一份完整快照。Phase 1 只做「可追溯」，尚未提供一键回滚到指定版本的界面；
            如需回退，请在编辑页把内容改回旧值后重新发布（会生成新版本号，历史不被覆盖）。
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}

/** 找出两侧 JSON 不一致的顶层字段（浅比较，够用于发布前核对） */
function diffKeys(
  entity: Record<string, unknown>,
  draft: Record<string, unknown> | null,
): string[] {
  if (!draft) return [];
  const keys = new Set([...Object.keys(entity), ...Object.keys(draft)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(entity[key]) !== JSON.stringify(draft[key])) changed.push(key);
  }
  return changed.sort();
}
