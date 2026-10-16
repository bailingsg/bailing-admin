'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  SCHEMA_TYPE_LABELS,
  SEO_LENGTH_GUIDE,
  type SeoProfile,
  type SchemaType,
  type SeoSettings,
} from '@/lib/seo';
import { SEO_STATUS_LABELS } from '@/lib/seo';
import { scoreLabel } from '../../seo-badges';
import { SeoPreviewPanel } from '../../seo-preview';
import { quickFixSeoAction, saveSeoProfileAction } from './actions';

/**
 * SEO 编辑器（Phase 5.0，任务书四十节编辑页结构）
 *
 * 分区：Basic SEO → Social Preview → Canonical & Robots → Schema → Related →
 * SEO Score / Audit Results。保存后前台 metadata / sitemap / robots 经由
 * 后端 revalidate 联动刷新。
 */

type TabKey = 'basic' | 'social' | 'canonical' | 'schema' | 'score';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'Basic SEO' },
  { key: 'social', label: 'Social Preview' },
  { key: 'canonical', label: 'Canonical & Robots' },
  { key: 'schema', label: 'Schema' },
  { key: 'score', label: 'SEO Score & Audit' },
];

const SCHEMA_OPTIONS: SchemaType[] = ['NONE', 'WEB_PAGE', 'PRODUCT', 'ARTICLE', 'FAQ_PAGE'];

export function SeoEditor({
  profile,
  settings,
  entityType,
  entityId,
}: {
  profile: SeoProfile;
  settings: SeoSettings;
  entityType: string;
  entityId: string;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [tab, setTab] = React.useState<TabKey>('basic');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  // 实时预览用的表单镜像
  const [preview, setPreview] = React.useState({
    title: profile.metaTitle ?? '',
    description: profile.metaDescription ?? '',
    canonical: profile.canonicalUrl ?? '',
    ogImage: profile.ogImage ?? '',
  });

  const bindPreview = (key: keyof typeof preview) => ({
    value: preview[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setPreview((prev) => ({ ...prev, [key]: event.target.value })),
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const result = await saveSeoProfileAction(entityType, entityId, { ok: false }, formData);
    setSaving(false);
    setMessage(result.ok ? { ok: true, text: '已保存，前台 SEO 元数据已联动刷新。' } : { ok: false, text: result.error ?? '保存失败' });
    if (result.ok) router.refresh();
  }

  const [fixing, setFixing] = React.useState<string | null>(null);
  const [fixDiff, setFixDiff] = React.useState<{
    mode: 'preview' | 'apply';
    applied: { field: string; before: string | null; after: string }[];
    skipped: { field: string; reason: string }[];
  } | null>(null);

  async function runQuickFix(field: string, dryRun: boolean) {
    setFixing(field);
    const result = await quickFixSeoAction(entityType, entityId, [field], dryRun);
    setFixing(null);
    if (!result.ok) {
      setFixDiff(null);
      setMessage({ ok: false, text: result.error ?? '快捷修复失败' });
      return;
    }
    setFixDiff({
      mode: result.mode ?? 'preview',
      applied: result.applied ?? [],
      skipped: result.skipped ?? [],
    });
    if (!dryRun) router.refresh();
  }

  const previewUrl = profile.routePath
    ? `${settings.canonicalDomain ?? 'https://bailingwooden.com'}${profile.routePath}`
    : 'https://bailingwooden.com';

  return (
    <div className="flex flex-col gap-6">
      {/* 实体信息 */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-small font-medium text-foreground">{profile.entityName ?? entityId}</p>
            <code className="text-caption text-text-muted">{profile.routePath ?? '—'}</code>
          </div>
          <div className="flex items-center gap-2">
            {profile.seoScore !== null ? (
              <span className="text-small text-text-secondary">
                SEO 分数 <span className="font-semibold text-foreground">{profile.seoScore}</span>（{scoreLabel(profile.seoScore)}）
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Tab 切换 */}
      <div role="tablist" aria-label="SEO 编辑分区" className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-small transition-colors duration-[var(--duration-fast)]',
              tab === item.key
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-text-secondary hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6">
        {tab === 'basic' && (
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <Field
                label="Meta Title（SEO 标题）"
                hint={`留空时由标题模板生成。推荐 ${SEO_LENGTH_GUIDE.TITLE_MIN}–${SEO_LENGTH_GUIDE.TITLE_MAX} 字符。`}
                counter={preview.title.length}
                counterMax={SEO_LENGTH_GUIDE.TITLE_MAX}
              >
                <input
                  name="metaTitle"
                  defaultValue={profile.metaTitle ?? ''}
                  {...bindPreview('title')}
                  placeholder="如 Plywood Manufacturer | Bailing Wooden"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>

              <Field
                label="Meta Description"
                hint={`推荐 ${SEO_LENGTH_GUIDE.DESCRIPTION_MIN}–${SEO_LENGTH_GUIDE.DESCRIPTION_MAX} 字符；不强制限制。`}
                counter={preview.description.length}
                counterMax={SEO_LENGTH_GUIDE.DESCRIPTION_MAX}
              >
                <Textarea
                  name="metaDescription"
                  defaultValue={profile.metaDescription ?? ''}
                  {...bindPreview('description')}
                  rows={3}
                  placeholder="面向海外采购商的行动导向描述"
                />
              </Field>

              <Field label="Focus Keyword（焦点关键词）" hint="仅用于 SEO 分析与管理参考；严禁在正文堆砌关键词。">
                <input
                  name="focusKeyword"
                  defaultValue={profile.focusKeyword ?? ''}
                  placeholder="如 plywood manufacturer"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>

              <Field label="Keywords（逗号分隔）" hint="内部管理用途；Google 不依赖 meta keywords，不作主要 SEO 机制。">
                <input
                  name="keywords"
                  defaultValue={profile.keywords ?? ''}
                  placeholder="plywood, MDF, wood panels"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {tab === 'social' && (
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <p className="text-small text-text-secondary">
                取值优先级：手动填写 → 页面内容 → 全局设置默认值。留空自动生成。
              </p>
              <Field label="og:title">
                <input
                  name="ogTitle"
                  defaultValue={profile.ogTitle ?? ''}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
              <Field label="og:description">
                <Textarea name="ogDescription" defaultValue={profile.ogDescription ?? ''} rows={2} />
              </Field>
              <Field label="og:image" hint="站内路径（/xxx）或 https 绝对地址；建议 1200×630。">
                <input
                  name="ogImage"
                  defaultValue={profile.ogImage ?? ''}
                  {...bindPreview('ogImage')}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
              <Field label="twitter:title">
                <input
                  name="twitterTitle"
                  defaultValue={profile.twitterTitle ?? ''}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
              <Field label="twitter:description">
                <Textarea name="twitterDescription" defaultValue={profile.twitterDescription ?? ''} rows={2} />
              </Field>
              <Field label="twitter:image">
                <input
                  name="twitterImage"
                  defaultValue={profile.twitterImage ?? ''}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {tab === 'canonical' && (
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <Field
                label="Canonical URL"
                hint="留空 = 自动使用当前页面标准 URL。域名必须与 Global Settings 的规范域名一致；不允许带查询串 / hash / 结尾斜杠。"
              >
                <input
                  name="canonicalUrl"
                  defaultValue={profile.canonicalUrl ?? ''}
                  {...bindPreview('canonical')}
                  placeholder={`${settings.canonicalDomain ?? 'https://bailingwooden.com'}${profile.routePath ?? ''}`}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </Field>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-small text-foreground">
                  <input
                    type="checkbox"
                    name="robotsIndex"
                    defaultChecked={profile.robotsIndex}
                    className="size-4 rounded border-border"
                  />
                  允许索引（Index）
                </label>
                <label className="flex items-center gap-2 text-small text-foreground">
                  <input
                    type="checkbox"
                    name="robotsFollow"
                    defaultChecked={profile.robotsFollow}
                    className="size-4 rounded border-border"
                  />
                  允许跟随链接（Follow）
                </label>
              </div>
              <p className="text-caption text-text-muted">
                默认 index / follow。登录页、后台、测试页等应设为 noindex——但那些页面不属于本管理中心的管理范围。
              </p>
            </CardContent>
          </Card>
        )}

        {tab === 'schema' && (
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <Field label="Schema.org 类型" hint="产品页选 Product；博客文章选 Article（详情页会自动输出 Article Schema）；含 FAQ 的页面选 FAQPage。">
                <select
                  name="schemaType"
                  defaultValue={profile.schemaType}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {SCHEMA_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {SCHEMA_TYPE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="FAQ 结构化数据（JSON 数组）"
                hint='仅支持 [{ "question": "...", "answer": "..." }]，最多 20 条、每条 500 字符；不允许 HTML。留空不输出。'
              >
                <Textarea
                  name="schemaData"
                  defaultValue={
                    profile.schemaData ? JSON.stringify(profile.schemaData, null, 2) : ''
                  }
                  rows={6}
                  placeholder={'[\n  {\n    "question": "Do you provide samples?",\n    "answer": "..."\n  }\n]'}
                  className="font-mono text-caption"
                />
              </Field>
              <Field
                label="相关内容（内链管理，JSON）"
                hint='{ "products": ["slug"], "posts": ["slug"], "applications": ["slug"] }，每类最多 6 个。用于前台「相关产品 / 相关文章」与内链建设。'
              >
                <Textarea
                  name="relatedData"
                  defaultValue={
                    profile.relatedData ? JSON.stringify(profile.relatedData, null, 2) : ''
                  }
                  rows={4}
                  placeholder={'{\n  "products": ["plywood-board"],\n  "posts": ["mdf-buying-guide"]\n}'}
                  className="font-mono text-caption"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {tab === 'score' && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-small font-medium text-foreground">
                  SEO 评分明细（可解释：为什么是这个分数）
                </h3>
                {profile.seoScore !== null ? (
                  <span className="text-small text-text-secondary">
                    当前 {profile.seoScore} 分 · 状态 {SEO_STATUS_LABELS[profile.seoStatus as keyof typeof SEO_STATUS_LABELS] ?? profile.seoStatus}
                  </span>
                ) : null}
              </div>
              {profile.checks && profile.checks.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {profile.checks.map((check) => (
                    <li key={check.key} className="flex items-start gap-3 py-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-caption',
                          check.severity === 'passed'
                            ? 'bg-green-100 text-green-700'
                            : check.severity === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700',
                        )}
                      >
                        {check.severity === 'passed' ? '✓' : check.severity === 'warning' ? '⚠' : '✗'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-small text-foreground">
                          {check.label}
                          <span className="ml-2 text-caption text-text-muted">
                            {check.earned}/{check.weight} 分
                          </span>
                        </p>
                        <p className="text-caption text-text-secondary">{check.message}</p>
                        {check.suggestion ? (
                          <p className="text-caption text-amber-700">建议：{check.suggestion}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-text-secondary">暂无评分明细。</p>
              )}

              {/* 快捷修复（先预览 diff，确认后应用） */}
              <div className="rounded-md border border-border bg-muted/40 p-4">
                <h4 className="text-small font-medium text-foreground">快捷修复（仅填补空缺，不覆盖已有值）</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['canonicalUrl', 'metaTitle', 'metaDescription', 'ogImage'] as const).map((field) => (
                    <Button
                      key={field}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fixing !== null}
                      onClick={() => runQuickFix(field, true)}
                    >
                      {fixing === field ? '计算中…' : `生成缺失 ${field}`}
                    </Button>
                  ))}
                </div>
                {fixDiff ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {fixDiff.applied.length === 0 ? (
                      <p className="text-small text-text-secondary">无需修复（字段已有值或无法自动生成）。</p>
                    ) : (
                      <>
                        <ul className="flex flex-col gap-1">
                          {fixDiff.applied.map((item) => (
                            <li key={item.field} className="text-small text-foreground">
                              <code className="text-caption">{item.field}</code>：
                              <span className="text-text-muted"> {item.before ?? '（空）'}</span>
                              {' → '}
                              <span className="font-medium text-green-700">{item.after}</span>
                            </li>
                          ))}
                        </ul>
                        {fixDiff.mode === 'preview' ? (
                          <Button
                            type="button"
                            size="sm"
                            className="w-fit"
                            disabled={fixing !== null}
                            onClick={() => runQuickFix(fixDiff.applied[0].field, false)}
                          >
                            确认应用以上修改
                          </Button>
                        ) : (
                          <p className="text-small text-green-700">已应用。</p>
                        )}
                      </>
                    )}
                    {fixDiff.skipped.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {fixDiff.skipped.map((item) => (
                          <li key={item.field} className="text-caption text-text-muted">
                            {item.field}：{item.reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 预览 + 保存 */}
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <h3 className="text-small font-medium text-foreground">搜索结果 / 社交分享预览</h3>
            <SeoPreviewPanel
              title={preview.title || profile.entityName || ''}
              description={preview.description}
              url={previewUrl}
              image={preview.ogImage || settings.defaultOgImage}
              siteName={settings.siteName}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存 SEO 设置'}
          </Button>
          {message ? (
            <p className={cn('text-small', message.ok ? 'text-green-700' : 'text-red-700')}>{message.text}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  counter,
  counterMax,
  children,
}: {
  label: string;
  hint?: string;
  counter?: number;
  counterMax?: number;
  children: React.ReactNode;
}) {
  const over = counter !== undefined && counterMax !== undefined && counter > counterMax;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-small font-medium text-foreground">{label}</Label>
        {counter !== undefined ? (
          <span className={cn('text-caption tabular-nums', over ? 'text-amber-600' : 'text-text-muted')}>
            {counter} 字符{counterMax ? ` / 推荐 ≤ ${counterMax}` : ''}
            {over ? '（超出推荐长度）' : ''}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
    </div>
  );
}
