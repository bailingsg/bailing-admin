# bailing-admin — 百灵木业 B2B 管理后台

百灵木业 B2B 网站体系的**管理后台前端**：Next.js 15 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui，技术路线与主站 [`bailing-ui`](../bailing-ui) 保持一致。

配套仓库：主站 [`bailing-ui`](../bailing-ui) · 后端 [`bailing-backend`](../bailing-backend)。

三仓库本地联调规范（端口、环境变量、启动顺序、排查）见共享工作区文档：[`docs/LOCAL-DEV-SETUP.md`](../docs/LOCAL-DEV-SETUP.md)。

## 技术栈

- Next.js 15（App Router，优先 Server Components）
- TypeScript（strict）
- Tailwind CSS v4 + shadcn/ui（new-york 风格）
- ESLint（next/core-web-vitals + next/typescript）

## 目录结构

```
bailing-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # 根布局（字体 + 侧边导航 + 内容区，响应式）
│   │   ├── page.tsx                  # 后台入口页（概览 + 后端连接状态）
│   │   ├── design-system/            # 设计系统预览页（开发自检用，非业务页面）
│   │   └── globals.css               # Tailwind v4 入口 + 语义令牌映射
│   ├── styles/tokens.css             # ★ 设计令牌（与主站同源，后台语义层）
│   ├── tokens/index.ts               # 令牌 TS 出口（断点、容器宽度、色值等）
│   ├── components/
│   │   ├── layout/                   # Container / PageHeader
│   │   ├── ui/                       # Button / Card / Badge / Input / Textarea / Select / Label / FileUpload / Spinner
│   │   ├── admin-sidebar.tsx         # 侧边导航（深色，响应式）
│   │   └── backend-status-card.tsx   # 后端连接状态卡片
│   └── lib/utils.ts                  # cn() 工具
├── components.json                   # shadcn/ui 配置
└── next.config.ts
```

## 设计系统（Phase 3.2）

与主站**同源**：共用品牌色阶、字体、字号阶梯、间距、圆角与阴影；仅语义层按管理后台场景裁剪，视觉为**专业管理系统**风格（中性画布 + 白色卡片 + 深色侧边栏），不使用营销官网的米色大面积留白。

| 体系 | 后台差异 |
| --- | --- |
| 颜色 | 额外语义令牌：`surface-sunken`（下沉区域）、`sidebar*`（侧边导航）、`header*`（页头）、`table-header` / `table-row-hover`（数据表格） |
| 字号 | 与主站共用同一套 `text-*` 语义字号（h1 默认 `heading-lg`，密度高于官网） |
| 间距 | 与主站同一规范阶梯；后台组件使用更紧凑的内边距 |
| 组件 | Button（primary/secondary/outline/ghost/danger + loading）、Card（组合式）、Badge（状态语义：success/warning/info/muted/destructive）、Input/Textarea/Select/Label/FileUpload、Container/PageHeader |
| 响应式 | Mobile First；< 768px 侧边栏收起为顶部栏 + 汉堡展开 |

预览与自检页面：`/design-system`（`noindex`，不含业务数据）。**后台只能通过后端 REST API 访问数据，不得直连数据库**；本阶段未同步主站的营销类组件（ProductCard、Navbar、Footer 等）。

## 快速开始（本地开发）

前置：Node.js ≥ 20；建议先启动后端与数据库（见 `bailing-backend/README.md`）。

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env

# 3. 启动开发服务器（端口 3001）
npm run dev
```

访问：<http://localhost:3001>。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（热更新，端口 3001） |
| `npm run build` / `npm run start` | 生产构建 / 运行（端口 3001） |
| `npm run lint` / `npm run typecheck` | ESLint / tsc |

## 环境变量

见 [.env.example](./.env.example)：

- `NEXT_PUBLIC_API_BASE_URL`：后端 API 基地址（默认 `http://127.0.0.1:4000/api/v1`），入口页在服务端请求它展示真实连接状态。
- `ADMIN_API_BASE_URL`：服务端专用后端地址（优先级高于 `NEXT_PUBLIC_API_BASE_URL`）。
- `ADMIN_API_TOKEN`：RFQ 后台接口的共享密钥（服务端变量，禁止 `NEXT_PUBLIC_` 前缀）。
- `ADMIN_SESSION_MAX_AGE`：HttpOnly 登录会话有效期（秒，默认 900，与后端 `JWT_EXPIRES_IN` 一致）。
- 安全要求：`NEXT_PUBLIC_` 前缀的变量会进入浏览器包，**禁止**放置数据库密码、邮箱密码、COS 密钥、登录 Token 等敏感信息。后台只能通过后端 REST API 访问业务数据，**不得直连 PostgreSQL**。

## 管理员登录（Phase 4.1）

- 登录页 `/login`：邮箱 + 口令 → 同源路由 `POST /api/auth/login`（服务端转发后端并把 JWT 写入 **HttpOnly Cookie** `admin_session`）。浏览器 JS 不接触令牌，规避 localStorage 方案的 XSS 泄漏风险。
- 会话校验链：middleware（Cookie 存在性拦截 `/dashboard/**`、`/rfq/**`）→ `(dashboard)` 布局以 JWT 调后端 `/auth/me`（伪造或过期令牌在此被拒并回登录页）。
- 登出：`POST /api/auth/logout` 清除 Cookie。
- Dashboard 统计卡片数据来自后端 `GET /api/v1/cms/stats`（JWT 保护），全部为真实计数。

## 当前状态（Phase 4.2）

- 最小可运行工程：布局与导航骨架、后端连接状态探测（`/api/v1/health/ready`）。
- UI 设计系统同步完成：令牌（与主站同源）、字体、Button/Card/Badge、表单控件（Input/Textarea/Select/Label/FileUpload）、Container/PageHeader。
- 管理员认证已上线（Phase 4.1）：登录页、HttpOnly Cookie 会话、Dashboard（侧边栏 + 顶栏 + 统计卡片）、路由保护。
- Products CMS 已上线（Phase 4.2）：
  - `/products` 列表（图片/名称/分类/状态/Featured/更新时间/操作 + keyword 搜索 + 分类/状态筛选 + 分页）；
  - `/products/create`、`/products/[id]/edit`（复用同一表单：JSON 规格编辑器、Tag 应用标签、SEO、草稿/发布；编辑页含图片上传/删除/主图管理与删除产品）；
  - `/categories` 分类管理（新建、行内编辑、删除；含产品的分类禁删）；
  - 侧边栏 Products / Categories 已启用；middleware 保护 `/products/**`、`/categories/**`；
  - 所有写操作经服务端 Actions 提交（JWT 只在服务端读写 HttpOnly Cookie，浏览器 JS 不接触令牌）。
- 尚未实现（后续阶段开发，本仓库不做虚假演示）：
  - 博客文章与媒体资源管理（Media 库）
  - 富文本编辑器

## 与主站的关系

管理后台是独立仓库、独立进程，运行于 3001 端口；与主站（3000）、后端（4000）通过 HTTP API 联调，详细联调规范见三仓库联调说明。
