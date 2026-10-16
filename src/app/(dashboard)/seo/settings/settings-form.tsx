'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SeoSettings } from '@/lib/seo';
import { saveSeoSettingsAction, type SettingsFormState } from './actions';

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

/**
 * 全局设置表单（Phase 5.0）。
 *
 * 分区：站点 SEO / 标题模板 / 公司信息 / Social / 站长工具。
 * 公司信息只存运营确认过的数据——严禁虚构地址 / 电话 / 资质。
 */
export function SeoSettingsForm({ settings }: { settings: SeoSettings }) {
  const router = useRouter();
  const [state, setState] = React.useState<SettingsFormState>({ ok: false });
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const result = await saveSeoSettingsAction({ ok: false }, formData);
    setSaving(false);
    setState(result);
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* 站点 SEO */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <h2 className="text-small font-medium text-foreground">站点 SEO</h2>
          <Field label="Site Name" htmlFor="siteName">
            <input id="siteName" name="siteName" required defaultValue={settings.siteName} className={inputClass} />
          </Field>
          <Field label="Site Title（站点标题，缺省用 Site Name）" htmlFor="siteTitle">
            <input id="siteTitle" name="siteTitle" defaultValue={settings.siteTitle ?? ''} className={inputClass} />
          </Field>
          <Field label="Site Description（默认描述，页面缺省时兜底）" htmlFor="siteDescription">
            <textarea
              id="siteDescription"
              name="siteDescription"
              rows={2}
              defaultValue={settings.siteDescription ?? ''}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default OG Image" htmlFor="defaultOgImage">
              <input
                id="defaultOgImage"
                name="defaultOgImage"
                defaultValue={settings.defaultOgImage ?? ''}
                placeholder="/logo.webp 或 https://…"
                className={inputClass}
              />
            </Field>
            <Field label="Default Twitter Image" htmlFor="defaultTwitterImage">
              <input
                id="defaultTwitterImage"
                name="defaultTwitterImage"
                defaultValue={settings.defaultTwitterImage ?? ''}
                className={inputClass}
              />
            </Field>
          </div>
          <Field
            label="Canonical Domain（规范域名）"
            htmlFor="canonicalDomain"
            hint="robots.txt 的 Sitemap 地址与 canonical 域名校验都以此为准，如 https://bailingwooden.com（不含路径）。"
          >
            <input
              id="canonicalDomain"
              name="canonicalDomain"
              defaultValue={settings.canonicalDomain ?? ''}
              placeholder="https://bailingwooden.com"
              className={inputClass}
            />
          </Field>
        </CardContent>
      </Card>

      {/* 标题模板 */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <h2 className="text-small font-medium text-foreground">标题模板（%title% 占位符）</h2>
          <p className="text-caption text-text-muted">
            手动填写 SEO Title 的页面不会被模板覆盖；仅在手填为空时套用。
          </p>
          <Field label="页面标题模板" htmlFor="pageTitleTemplate">
            <input
              id="pageTitleTemplate"
              name="pageTitleTemplate"
              required
              defaultValue={settings.pageTitleTemplate}
              className={inputClass}
            />
          </Field>
          <Field label="产品标题模板" htmlFor="productTitleTemplate">
            <input
              id="productTitleTemplate"
              name="productTitleTemplate"
              required
              defaultValue={settings.productTitleTemplate}
              className={inputClass}
            />
          </Field>
          <Field label="博客标题模板" htmlFor="blogTitleTemplate">
            <input
              id="blogTitleTemplate"
              name="blogTitleTemplate"
              required
              defaultValue={settings.blogTitleTemplate}
              className={inputClass}
            />
          </Field>
          <Field label="分类标题模板" htmlFor="categoryTitleTemplate">
            <input
              id="categoryTitleTemplate"
              name="categoryTitleTemplate"
              required
              defaultValue={settings.categoryTitleTemplate}
              className={inputClass}
            />
          </Field>
        </CardContent>
      </Card>

      {/* 公司信息 */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <h2 className="text-small font-medium text-foreground">公司信息（Organization Schema 数据源）</h2>
          <p className="text-caption text-text-muted">
            仅输出已填写字段；未确认的信息请留空——严禁虚构地址 / 电话 / 资质。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name" htmlFor="companyName">
              <input
                id="companyName"
                name="companyName"
                defaultValue={settings.companyName ?? ''}
                className={inputClass}
              />
            </Field>
            <Field label="Company Logo" htmlFor="companyLogo">
              <input
                id="companyLogo"
                name="companyLogo"
                defaultValue={settings.companyLogo ?? ''}
                className={inputClass}
              />
            </Field>
            <Field label="Website" htmlFor="companyWebsite">
              <input
                id="companyWebsite"
                name="companyWebsite"
                defaultValue={settings.companyWebsite ?? ''}
                className={inputClass}
              />
            </Field>
            <Field label="Email（销售联系）" htmlFor="companyEmail">
              <input
                id="companyEmail"
                name="companyEmail"
                defaultValue={settings.companyEmail ?? ''}
                className={inputClass}
              />
            </Field>
            <Field label="Phone" htmlFor="companyPhone">
              <input
                id="companyPhone"
                name="companyPhone"
                defaultValue={settings.companyPhone ?? ''}
                className={inputClass}
              />
            </Field>
            <Field label="Country" htmlFor="companyCountry">
              <input
                id="companyCountry"
                name="companyCountry"
                defaultValue={settings.companyCountry ?? ''}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Address" htmlFor="companyAddress">
            <input
              id="companyAddress"
              name="companyAddress"
              defaultValue={settings.companyAddress ?? ''}
              className={inputClass}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Social */}
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          <h2 className="text-small font-medium text-foreground sm:col-span-2">Social（https 链接）</h2>
          {(['linkedin', 'facebook', 'instagram', 'youtube', 'whatsapp'] as const).map((key) => (
            <Field key={key} label={key} htmlFor={key}>
              <input
                id={key}
                name={key}
                defaultValue={settings[key] ?? ''}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      {/* 站长工具 */}
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          <h2 className="text-small font-medium text-foreground sm:col-span-2">站长工具</h2>
          <Field
            label="Google Search Console Verification"
            htmlFor="googleSiteVerification"
            hint="配置后前台自动输出 google-site-verification meta；留空不输出空标签。"
          >
            <input
              id="googleSiteVerification"
              name="googleSiteVerification"
              defaultValue={settings.googleSiteVerification ?? ''}
              className={inputClass}
            />
          </Field>
          <Field label="Google Analytics Measurement ID" htmlFor="googleAnalyticsId" hint="预留配置能力，不强制加载第三方脚本。">
            <input
              id="googleAnalyticsId"
              name="googleAnalyticsId"
              defaultValue={settings.googleAnalyticsId ?? ''}
              placeholder="G-XXXXXXX"
              className={inputClass}
            />
          </Field>
          <Field label="Google Tag Manager ID" htmlFor="googleTagManagerId" hint="预留配置能力，不强制加载第三方脚本。">
            <input
              id="googleTagManagerId"
              name="googleTagManagerId"
              defaultValue={settings.googleTagManagerId ?? ''}
              placeholder="GTM-XXXXXXX"
              className={inputClass}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存全局设置'}
        </Button>
        {state.ok ? <p className="text-small text-green-700">已保存，前台元数据 / sitemap / robots 已联动刷新。</p> : null}
        {!state.ok && state.error ? <p className="text-small text-red-700">{state.error}</p> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-small font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
    </div>
  );
}
