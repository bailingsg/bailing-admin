import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mergeDraftForPreview } from '@/lib/draft-merge';
import { buildPreviewDoc, diffPreviewDocs, labelOfKeys, type PreviewDoc } from '@/lib/preview-doc';
import { getSessionToken } from '@/lib/session';
import {
  PUBLISHABLE_LABELS,
  getContentPreview,
  getContentRevisions,
  isPublishableKind,
  type ContentPreview,
  type ContentRevision,
  type PublishableKind,
} from '@/lib/publishing';
import { PreviewDocView } from './preview-doc-view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '内容预览',
  description: '对照查看线上版本与未发布的编辑稿。',
};

/** 各内容类型的后台列表路由（面包屑 / 返回按钮） */
const LIST_ROUTES: Record<PublishableKind, string> = {
  products: '/products',
  'blog/posts': '/blog',
  factory: '/factory',
  quality: '/quality',
  applications: '/applications',
  'site/sections': '/site-content',
};

/** 线上版本一侧不参与高亮（避免把「基准」也染黄） */
const EMPTY_SET: Set<string> = new Set();

/**
 * 通用预览页（Phase 1，Phase 1.1 改为可读渲染）。
 *
 * 路由：/preview/<kind>/<id>，kind 为后端控制器路径片段
 * （products / blog/posts / factory / quality / applications / site/sections）。
 *
 * 语义：
 *   · 左侧是**线上版本**（公开站此刻看到的内容）
 *   · 右侧是**编辑稿**（线上版本 + 未发布改动叠加后的效果，即「发布后会怎样」）
 *   · 两侧用同一套渲染器，有差异的字段高亮，顶部列出差异清单
 *   · 只有持有该模块 read 权限的后台账号能访问（后端 preview 接口鉴权）
 *
 * 为什么不再直接 dump JSON：预览的目的是「发布前肉眼核对」，而 JSON 里正文是
 * 转义后的 HTML、封面只有 id、SEO 与关联 id 混在一起，实际无法核对。
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
  const label = PUBLISHABLE_LABELS[kind];
  const listHref = LIST_ROUTES[kind];
  const history: ContentRevision[] =
    revisions.ok && Array.isArray(revisions.data) ? revisions.data : [];

  // 线上版本视图
  const publishedDoc = buildPreviewDoc(kind, preview.entity);

  // 编辑稿视图：把草稿叠加到线上版本后再归一（草稿是部分 Update DTO，直接渲染会缺字段）
  let draftDoc: PreviewDoc | null = null;
  let changed = new Set<string>();
  let mergeError: string | null = null;
  if (preview.draft) {
    try {
      const merged = await mergeDraftForPreview(kind, preview.entity, preview.draft, token);
      draftDoc = buildPreviewDoc(kind, merged);
      changed = diffPreviewDocs(publishedDoc, draftDoc);
    } catch (error) {
      // 编辑稿合并失败（媒体回查异常等）不应让整页崩掉：降级为只展示线上版本
      mergeError = error instanceof Error ? error.message : String(error);
    }
  }

  const changedLabels = draftDoc ? labelOfKeys(draftDoc, changed) : [];
  const isPublished = preview.status === 'PUBLISHED';

  return (
    <Container width="page" className="py-8">
      <PageHeader
        title={`预览：${label}`}
        description="左侧是公开站此刻的线上版本，右侧是叠加了未发布改动后的效果（即发布后的样子）。"
        breadcrumb={
          <Link href={listHref} className="hover:text-foreground">
            返回列表
          </Link>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>返回列表</Link>
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant={isPublished ? 'success' : 'muted'}>
          {isPublished ? '已发布' : '未上线'}
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
        <CardContent className="flex flex-col gap-2">
          {!draftDoc ? (
            <p className="text-small text-text-secondary">
              当前没有编辑稿，线上版本即最终内容。
            </p>
          ) : mergeError ? (
            <p className="text-small text-destructive">
              编辑稿解析失败：{mergeError}（右侧未展示编辑稿效果）
            </p>
          ) : changed.size === 0 ? (
            <p className="text-small text-text-secondary">
              编辑稿与线上版本内容一致，发布不会改变公开站呈现。
            </p>
          ) : (
            <p className="text-small text-text-secondary">
              以下内容与线上版本不同（右侧已高亮）：
              <span className="ml-1 font-medium text-foreground">{changedLabels.join('、')}</span>
            </p>
          )}
          {!isPublished ? (
            <p className="text-caption text-text-muted">
              该{label}当前未上线，公开站不可见；「线上版本」展示的是最近一次发布的内容。
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              线上版本{isPublished ? '（公开站可见）' : '（已下架，公开站不可见）'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewDocView doc={publishedDoc} changed={EMPTY_SET} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>编辑稿（未发布）</CardTitle>
          </CardHeader>
          <CardContent>
            {draftDoc ? (
              <PreviewDocView doc={draftDoc} changed={changed} />
            ) : (
              <div className="flex flex-col gap-2 py-6">
                <p className="text-small font-medium text-foreground">没有编辑稿</p>
                <p className="text-small text-text-secondary">
                  当前保存的内容就是线上版本，右侧没有可对照的未发布改动。
                </p>
                <p className="text-caption text-text-muted">
                  在编辑页修改并保存后，这里会显示「发布后的效果」。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <details className="mt-6 rounded-lg border border-border bg-surface-elevated">
        <summary className="cursor-pointer px-4 py-3 text-small font-medium text-text-secondary hover:text-foreground">
          查看原始 JSON（排障用）
        </summary>
        <div className="grid gap-4 border-t border-border p-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-caption text-text-muted">线上版本 DTO</p>
            <pre className="max-h-[28rem] overflow-auto rounded-md bg-table-header p-3 text-caption leading-relaxed text-foreground">
              {JSON.stringify(preview.entity, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-caption text-text-muted">编辑稿 payload（Update DTO 快照）</p>
            {preview.draft ? (
              <pre className="max-h-[28rem] overflow-auto rounded-md bg-table-header p-3 text-caption leading-relaxed text-foreground">
                {JSON.stringify(preview.draft, null, 2)}
              </pre>
            ) : (
              <p className="text-small text-text-secondary">无编辑稿</p>
            )}
          </div>
        </div>
      </details>

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
