# Kodoko（コドコ）

> 今日、子どもとどこ行こう？／今天和孩子去哪里？

面向日本育儿家庭，特别是**在日外国人家庭**的亲子生活辅助平台。First Release 聚焦三个核心问题：

1. 今天带孩子去哪里玩
2. 在本地管理儿童基本资料
3. 根据儿童年龄、居住地区和家庭偏好展示育儿知识与政策提醒

## 架构原则

- **Local-first**：儿童资料默认只存储在设备本地（IndexedDB），默认不上传服务器。
- **后端最小化**：后端只负责登录、账号身份与公共数据（地点/知识/政策/内容版本）。
- **隐私默认开启**：不上传、不公开、不收集精确家庭住址与儿童照片。
- **未登录可用**：登录不是使用产品的前置条件。

完整约束见 [`AGENTS.md`](./AGENTS.md)。

## Monorepo 结构

```text
apps/
  web/       React Web / PWA
  api/       最小后端 API（Fastify）
  admin/     公共内容管理后台（后续启用，占位）
packages/
  ui/        共享 UI 组件
  domain/    领域模型与规则（年龄/月龄计算等）
  local-db/  IndexedDB 封装（Dexie + Repository + 备份）
  recommendation/  客户端推荐评分
  policy-engine/   客户端政策匹配规则
  api-client/      API Client
  config/    TypeScript / ESLint / Vitest 共享配置
  i18n/      多语言资源
docs/         架构、产品、ADR、隐私、API 文档
infra/       基础设施占位
scripts/     工具脚本
```

## 常用命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 并行启动 web + api
pnpm lint           # Lint
pnpm typecheck      # 类型检查
pnpm test           # 单元测试
pnpm build          # 构建
pnpm test:local-db  # 本地数据库测试（含迁移）
pnpm test:e2e       # E2E
```