# bailing-admin — 百灵木业 B2B 管理后台

> **状态：Phase 1 占位仓库，尚未启动开发。**

## 定位

Bailing Wooden B2B 网站体系的**管理后台**，与另外两个仓库配套：

| 仓库 | 定位 |
| --- | --- |
| `bailing-ui` | 面向海外采购商的主站（Next.js） |
| `bailing-admin` | 内部管理后台（本仓库） |
| `bailing-backend` | 后端 REST API + PostgreSQL + Prisma |

规划中的管理后台功能（Phase 2+ 逐步实现）：

- 管理员登录与权限（`AdminUser` 模型已就绪）
- 产品与分类管理
- 询盘查看与状态跟进
- 博客文章管理
- 媒体资源管理（腾讯云 COS）

## 本阶段（Phase 1）不开发的原因

Phase 1 规范明确禁止提前开展：产品管理后台、询盘管理后台、富文本编辑器、完整 CMS 等 Phase 2 工作。因此本仓库仅保留分支结构与占位说明，不包含业务代码。

## 技术选型（Phase 2 启动时确定）

候选方向（尚未决定，启动 Phase 2 时评估）：

1. **Next.js 15 + shadcn/ui**：与主站 `bailing-ui` 技术栈同构，复用组件与规范，推荐；
2. 独立 SPA（Vite + React）：构建产物更轻，但需要额外搭建路由与鉴权体系。

无论选择哪种方案，管理后台只能通过 `bailing-backend` 的 REST API 访问业务数据（Token 鉴权方案在 Phase 2 设计），不得直连数据库。

## 分支结构

与主站、后端保持一致：`master`（主干）→ `dev`（开发）→ `YYMMDD`（日常开发分支，如 `261013`）。
