import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/ui/file-upload';
import { brandPalette, spacingScale, typeScale } from '@/tokens';

export const metadata: Metadata = {
  title: '设计系统预览',
  description: 'Phase 3.2 后台设计系统组件与令牌自检页面（开发用，非业务页面）。',
  robots: { index: false, follow: false },
};

/** 色板：仅展示令牌名称，不涉及业务数据 */
const colorGroups: { title: string; note: string; tokens: string[] }[] = [
  {
    title: 'Brand · Wood Brown（与主站共享）',
    note: '主色：主要操作按钮、品牌标识',
    tokens: ['brand-50', 'brand-100', 'brand-200', 'brand-300', 'brand-400', 'brand-500', 'brand-600', 'brand-700', 'brand-800', 'brand-900'],
  },
  {
    title: 'Neutral · 暖灰',
    note: '中性色：画布、边框、文本',
    tokens: ['neutral-50', 'neutral-100', 'neutral-200', 'neutral-300', 'neutral-400', 'neutral-500', 'neutral-600', 'neutral-700', 'neutral-800', 'neutral-900'],
  },
  {
    title: 'Semantic · 语义色',
    note: '状态反馈：成功 / 警告 / 危险 / 信息',
    tokens: ['success-50', 'success-600', 'warning-50', 'warning-600', 'danger-50', 'danger-600', 'info-50', 'info-600'],
  },
];

const semanticTokens: { name: string; className: string; usage: string }[] = [
  { name: 'background', className: 'bg-background border', usage: '页面画布' },
  { name: 'surface-elevated', className: 'bg-surface-elevated border', usage: '卡片 / 面板' },
  { name: 'surface-sunken', className: 'bg-surface-sunken border', usage: '下沉区域' },
  { name: 'sidebar', className: 'bg-sidebar', usage: '侧边导航' },
  { name: 'header', className: 'bg-header border', usage: '页面头部' },
  { name: 'table-header', className: 'bg-table-header border', usage: '表格表头' },
  { name: 'primary', className: 'bg-primary', usage: '主要操作' },
  { name: 'destructive', className: 'bg-destructive', usage: '危险操作' },
];

export default function AdminDesignSystemPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="设计系统预览"
        description="本页用于后台设计系统自检与组件渲染验证。页面中的名称/描述均为占位示例，不代表真实业务数据；业务页面将在后续阶段开发。"
      />

      <Container width="page" className="flex flex-col gap-8 py-6 sm:py-8">
        {/* 颜色 */}
        <section>
          <h2 className="mb-1 text-heading-sm">Color System</h2>
          <p className="mb-4 text-small text-text-secondary">
            颜色集中在 src/styles/tokens.css 管理，组件只使用语义别名。
          </p>
          <div className="flex flex-col gap-6">
            {colorGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-small font-semibold">{group.title}</h3>
                <p className="mb-2 text-caption text-text-muted">{group.note}</p>
                <ul className="flex flex-wrap gap-2">
                  {group.tokens.map((token) => (
                    <li key={token} className="flex flex-col gap-1">
                      <span
                        className="size-12 rounded-md border border-border"
                        style={{ background: `var(--color-${token})` }}
                      />
                      <span className="text-caption text-text-muted">{token}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="text-small font-semibold">Semantic Aliases</h3>
              <p className="mb-2 text-caption text-text-muted">后台组件实际引用的语义层</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {semanticTokens.map((token) => (
                  <li key={token.name} className="flex flex-col gap-1">
                    <span className={`h-10 rounded-md ${token.className}`} />
                    <span className="text-caption font-medium">{token.name}</span>
                    <span className="text-caption text-text-muted">{token.usage}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 字体与间距 */}
        <section>
          <h2 className="mb-1 text-heading-sm">Typography & Spacing</h2>
          <p className="mb-4 text-small text-text-secondary">
            与主站共用同一套语义字号（{typeScale.length} 级）与间距规范。
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="text-heading-xl">Heading XL</p>
              <p className="text-heading-lg">Heading LG</p>
              <p className="text-heading-md">Heading MD</p>
              <p className="text-heading-sm">Heading SM</p>
              <p className="text-body-lg">Body LG</p>
              <p className="text-body">Body</p>
              <p className="text-small">Small</p>
              <p className="text-caption">Caption</p>
            </div>
            <ul className="flex flex-col gap-2">
              {Object.entries(spacingScale).map(([name, value]) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="w-16 text-caption text-text-muted">space-{name}</span>
                  <span className="h-2.5 rounded-sm bg-primary" style={{ width: value }} />
                  <span className="text-caption text-text-muted">{value}</span>
                </li>
              ))}
              <li className="pt-2 text-caption text-text-muted">
                品牌色值（theme-color 等场景）：{brandPalette.woodBrown}
              </li>
            </ul>
          </div>
        </section>

        {/* Button */}
        <section>
          <h2 className="mb-1 text-heading-sm">Button</h2>
          <p className="mb-4 text-small text-text-secondary">
            变体 primary / secondary / outline / ghost / danger；状态含 disabled 与 loading。
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>新建</Button>
              <Button variant="secondary">次要操作</Button>
              <Button variant="outline">导出</Button>
              <Button variant="ghost">取消</Button>
              <Button variant="danger">删除</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </section>

        {/* Badge */}
        <section>
          <h2 className="mb-1 text-heading-sm">Badge</h2>
          <p className="mb-4 text-small text-text-secondary">
            用于记录状态展示（已发布 / 草稿 / 新询盘 / 跟进中等）。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="success">已发布</Badge>
            <Badge variant="warning">待处理</Badge>
            <Badge variant="info">跟进中</Badge>
            <Badge variant="muted">草稿</Badge>
            <Badge variant="destructive">已关闭</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="secondary">Secondary</Badge>
          </div>
        </section>

        {/* Card */}
        <section>
          <h2 className="mb-1 text-heading-sm">Card</h2>
          <p className="mb-4 text-small text-text-secondary">
            基础容器：标题 + 描述 + 内容 + 底部操作。
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Card Title</CardTitle>
                <CardDescription>卡片描述占位</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-small text-text-secondary">
                  适用于数据面板、详情区块与列表项。
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">
                  操作
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Status Card</CardTitle>
                  <Badge variant="success">正常</Badge>
                </div>
                <CardDescription>带状态标签的卡片</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-small text-text-secondary">用于列表中的状态可视化。</p>
              </CardContent>
            </Card>

            <Card className="bg-surface-sunken">
              <CardHeader className="pb-2">
                <CardTitle>Sunken Card</CardTitle>
                <CardDescription>下沉底色变体</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-small text-text-secondary">
                  用于分组容器内部的次级区块。
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form */}
        <section>
          <h2 className="mb-1 text-heading-sm">Form</h2>
          <p className="mb-4 text-small text-text-secondary">
            Input / Textarea / Select / FileUpload 基础控件（本阶段不含提交逻辑与接口）。
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ds-name" required>
                  名称
                </Label>
                <Input id="ds-name" placeholder="请输入名称" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ds-status">状态</Label>
                <Select id="ds-status" defaultValue="">
                  <option value="" disabled>
                    请选择
                  </option>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="archived">已归档</option>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ds-desc">描述</Label>
                <Textarea id="ds-desc" placeholder="请输入描述" rows={4} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ds-invalid">错误态</Label>
                <Input id="ds-invalid" aria-invalid defaultValue="invalid" />
                <span className="text-caption text-destructive">aria-invalid 触发危险色边框</span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <FileUpload label="上传附件" />
              <div className="flex flex-wrap items-center gap-3">
                <Button>保存</Button>
                <Button variant="outline" loading>
                  保存中
                </Button>
                <Button variant="ghost">取消</Button>
              </div>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
