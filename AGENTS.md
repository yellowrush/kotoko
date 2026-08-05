# AGENTS.md

> 本文件用于指导 Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI 等 AI Coding Agents 在本仓库中进行开发、重构、测试、评审和文档维护。
>
> 所有 Agent 在修改代码前，必须先阅读本文件，并将其视为仓库级最高优先级的工程约束之一。

---

# 1. 项目概述

## 1.1 项目代号

暂定名称：**コドコ（Kodoko）**

推荐品牌语：

> 今日、子どもとどこ行こう？  
> 今天和孩子去哪里？

## 1.2 产品定位

面向日本育儿家庭，特别是在日外国人家庭的亲子生活辅助平台。

First Release 聚焦三个核心问题：

1. 今天带孩子去哪里玩
2. 在本地管理儿童基本资料
3. 根据儿童年龄、居住地区和家庭偏好展示育儿知识与政策提醒

## 1.3 First Release 核心原则

First Release 采用：

- React Web App
- Local-first 数据架构
- 儿童相关数据默认不上传服务器
- 后端只提供登录和最基础账号能力
- 内容与地点数据作为公共数据提供
- 儿童画像、偏好和匹配结果尽量在客户端计算
- 用户无需登录也能使用核心功能
- 登录不能成为使用产品的前置条件

## 1.4 First Release 非目标

以下功能不属于 First Release：

- 儿童数据云同步
- 家庭成员共享
- 多设备同步
- AI 语音记录
- 联络帐生成
- 自动育儿日记
- 社区、评论、点赞和关注
- 保育园教师端
- 商家管理后台
- 复杂机器学习推荐
- 付费订阅
- 医疗诊断或发育诊断
- 自动代替用户提交政府申请

Agent 不得为了未来扩展提前引入复杂云端数据模型。

---

# 2. 架构总原则

## 2.1 Local-first

儿童相关数据默认存储于用户设备本地。

包括但不限于：

- 儿童昵称
- 出生日期
- 月龄
- 兴趣偏好
- 无障碍需求
- 常用距离
- 室内外偏好
- 浏览历史
- 收藏地点
- 已读育儿内容
- 政策提醒状态
- 用户自定义设置

First Release 不允许将以上数据上传服务器，除非有明确产品需求、隐私评估和 ADR。

## 2.2 后端最小化

First Release 后端仅负责：

- 登录
- 账号身份
- 登录状态
- 基础用户设置
- 可选的设备标识
- 服务端 Session
- 公共地点数据
- 公共育儿知识
- 公共政策内容
- 内容版本与更新信息

不负责：

- 儿童档案存储
- 儿童年龄计算
- 个性化儿童画像
- 儿童推荐历史
- 儿童政策匹配结果
- 儿童成长记录

## 2.3 隐私默认开启

产品必须遵循：

- 默认不上传
- 默认不公开
- 默认不要求真实姓名
- 默认不收集精确家庭住址
- 默认不收集儿童照片
- 默认不收集医疗数据
- 默认不将儿童数据发送给第三方 AI

## 2.4 渐进式扩展

未来若增加云同步，必须采用可选模式：

```text
Local Only
    |
    +--> User Opt-in
            |
            +--> Encrypted Cloud Sync
```

云同步不得通过应用升级自动开启。

---

# 3. 推荐技术栈

## 3.1 Monorepo

使用：

- pnpm workspace
- Turborepo

建议结构：

```text
kodoko/
├── apps/
│   ├── web/                  # React Web / PWA
│   ├── api/                  # 最小后端 API
│   └── admin/                # 公共内容管理后台，后续可启用
├── packages/
│   ├── ui/                   # 共享 UI
│   ├── domain/               # 领域模型与规则
│   ├── local-db/             # IndexedDB 封装
│   ├── recommendation/       # 客户端推荐规则
│   ├── policy-engine/        # 客户端政策匹配规则
│   ├── api-client/           # API Client
│   ├── config/               # TypeScript、ESLint、Vitest
│   └── i18n/                 # 多语言资源
├── docs/
│   ├── architecture/
│   ├── product/
│   ├── adr/
│   ├── privacy/
│   └── api/
├── infra/
├── scripts/
├── AGENTS.md
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── pnpm-workspace.yaml
└── turbo.json
```

---

# 4. 前端技术选型

## 4.1 主框架

使用：

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Zod
- React Hook Form
- Tailwind CSS
- shadcn/ui 或 Radix UI
- Dexie.js
- i18next
- Vitest
- React Testing Library
- Playwright

## 4.2 为什么选择 React + Vite

适合本项目的原因：

- 前端工程生态成熟
- Local-first 能力强
- 与 IndexedDB、Service Worker、PWA 集成自然
- 组件生态丰富
- 后续可以平滑迁移到 React Native 或 Expo
- 便于将领域逻辑拆分为独立 package
- 前后端职责边界清晰

## 4.3 状态管理边界

使用：

- TanStack Query：服务端公共数据
- Zustand：页面级和应用级状态
- Dexie.js：持久化本地儿童数据
- React Hook Form：表单状态
- URL Search Params：可分享的筛选状态

禁止将所有状态放进单一 Store。

## 4.4 状态分类

```text
Server State
- 地点
- 育儿知识
- 政策内容
- 内容版本
- 公共配置

Local Persistent State
- 儿童档案
- 用户偏好
- 收藏
- 已读状态
- 政策提醒状态

Ephemeral UI State
- Modal
- Drawer
- 临时筛选
- 当前 Tab
```

---

# 5. 本地数据存储

## 5.1 技术选型

使用：

- IndexedDB
- Dexie.js

禁止仅使用 localStorage 存储儿童档案。

原因：

- localStorage 容量有限
- 不支持结构化查询
- 同步阻塞主线程
- 数据迁移能力弱
- 不适合版本化 Schema

## 5.2 本地数据库

推荐数据库名称：

```text
kodoko-local
```

建议 Schema：

```ts
type LocalDatabaseSchema = {
  children: ChildProfile;
  preferences: UserPreference;
  favorites: FavoritePlace;
  knowledgeProgress: KnowledgeProgress;
  policyTasks: PolicyTaskState;
  recommendationHistory: RecommendationHistory;
  metadata: LocalMetadata;
};
```

## 5.3 ChildProfile

```ts
type ChildProfile = {
  id: string;
  displayName: string;
  birthDate: string;
  interests: string[];
  accessibilityNeeds: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
};
```

约束：

- `displayName` 推荐使用昵称
- 性别非必填
- 年龄由 `birthDate` 动态计算
- 不持久化冗余年龄字段
- 月龄计算统一放在 domain package
- 不得将 ChildProfile 发送到 API

## 5.4 本地数据库访问原则

所有 IndexedDB 操作必须通过：

```text
packages/local-db
```

禁止组件直接调用 Dexie。

推荐接口：

```ts
interface ChildRepository {
  list(): Promise<ChildProfile[]>;
  getById(id: string): Promise<ChildProfile | null>;
  create(input: CreateChildInput): Promise<ChildProfile>;
  update(id: string, input: UpdateChildInput): Promise<ChildProfile>;
  remove(id: string): Promise<void>;
}
```

## 5.5 本地数据迁移

每次 Schema 变化必须：

- 增加版本号
- 编写迁移
- 保留旧数据
- 测试升级路径
- 处理失败回滚
- 不允许静默清空数据库

示例：

```ts
db.version(1).stores({
  children: 'id, birthDate, updatedAt',
});

db.version(2)
  .stores({
    children: 'id, birthDate, updatedAt',
    favorites: '[childId+placeId], childId, placeId',
  })
  .upgrade(async (tx) => {
    // migration
  });
```

---

# 6. 后端技术选型

## 6.1 First Release 后端范围

推荐使用：

- Node.js
- TypeScript
- Fastify 或 NestJS
- PostgreSQL
- Auth.js 或独立认证服务
- REST API
- OpenAPI

若后端只负责认证与少量公共 API，优先：

- Fastify
- 或 Next.js Route Handlers
- 或独立轻量 Node API

若预计很快扩展到复杂业务，再选择 NestJS。

## 6.2 后端模块

First Release：

```text
AuthModule
UsersModule
ContentModule
PlacesModule
PoliciesModule
KnowledgeModule
HealthModule
```

明确不包含：

```text
ChildrenModule
ChildSyncModule
FamilyModule
GrowthModule
MedicalModule
```

## 6.3 登录能力

登录可支持：

- Email Magic Link
- Google
- Apple 后续加入

认证推荐：

- HttpOnly Cookie
- Secure
- SameSite=Lax 或 Strict
- 服务端 Session
- CSRF 防护

禁止把认证 Token 存在 localStorage。

## 6.4 登录的作用

First Release 登录仅用于：

- 账号识别
- 后续云同步预留
- 产品通知偏好
- 跨会话登录
- 可选的匿名数据归属
- 后续订阅能力预留

登录后仍不得上传儿童资料。

---

# 7. 公共数据设计

## 7.1 Place

```ts
type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string;
  municipalityCode: string;
  suitableAgeMinMonths?: number;
  suitableAgeMaxMonths?: number;
  indoorOutdoor: 'indoor' | 'outdoor' | 'mixed';
  priceLevel?: number;
  strollerFriendly?: boolean;
  nursingRoom?: boolean;
  diaperChanging?: boolean;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  status: 'draft' | 'published' | 'archived';
};
```

## 7.2 KnowledgeContent

```ts
type KnowledgeContent = {
  id: string;
  title: string;
  summary: string;
  body: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  categories: KnowledgeCategory[];
  locale: string;
  sourceReferences: SourceReference[];
  reviewedAt?: string;
  validFrom?: string;
  validUntil?: string;
  status: ContentStatus;
};
```

## 7.3 Policy

```ts
type Policy = {
  id: string;
  title: string;
  authorityLevel: 'national' | 'prefecture' | 'municipality';
  municipalityCode?: string;
  eligibilityRule: PolicyRule;
  applicationStartAt?: string;
  applicationDeadlineAt?: string;
  officialUrl: string;
  sourceCheckedAt: string;
  version: number;
  status: ContentStatus;
};
```

公共数据可以从服务端获取，并缓存在本地。

---

# 8. 客户端推荐架构

## 8.1 推荐在客户端执行

推荐输入：

```ts
type RecommendationInput = {
  childAgeMonths: number;
  interests: string[];
  accessibilityNeeds: string[];
  userLocation?: GeoPoint;
  maxDistanceKm?: number;
  indoorOutdoorPreference?: string;
  weather?: WeatherSummary;
  places: Place[];
};
```

推荐输出：

```ts
type PlaceRecommendation = {
  place: Place;
  score: number;
  reasons: RecommendationReason[];
};
```

## 8.2 推荐评分

```text
总分 =
年龄匹配
+ 距离匹配
+ 天气匹配
+ 营业状态
+ 室内外偏好
+ 设施便利度
+ 兴趣匹配
+ 内容新鲜度
```

推荐必须可解释。

示例：

- 适合 3～5 岁
- 距离约 2.1km
- 今天下雨，优先推荐室内
- 有授乳室
- 符合孩子对电车的兴趣

## 8.3 数据隔离

服务端只能接收公共查询条件，例如：

```text
latitude
longitude
radius
category
locale
```

服务端不得接收：

```text
childName
birthDate
exactAge
interests
accessibilityNeeds
```

除非未来经 ADR 明确调整。

---

# 9. 客户端政策匹配

## 9.1 策略

政策规则从服务器下载。

儿童资料与家庭条件保存在本地。

匹配在客户端执行。

```text
Public Policy Rules
        +
Local Child Profile
        +
Local Municipality
        |
        v
Client Policy Engine
```

## 9.2 PolicyRule

禁止执行动态 JavaScript。

```json
{
  "all": [
    {
      "field": "child.ageMonths",
      "operator": "lte",
      "value": 216
    },
    {
      "field": "user.municipalityCode",
      "operator": "eq",
      "value": "13108"
    }
  ]
}
```

规则引擎必须：

- 可测试
- 可解释
- 有版本
- 有来源
- 输出匹配原因
- 输出不匹配原因
- 不上传输入数据

## 9.3 匹配结果

匹配结果仅保存在本地：

```ts
type PolicyTaskState = {
  policyId: string;
  childId?: string;
  status: 'new' | 'viewed' | 'planned' | 'completed' | 'dismissed';
  reminderAt?: string;
  updatedAt: string;
};
```

---

# 10. PWA 与离线策略

## 10.1 PWA

First Release 推荐支持：

- 安装到主屏幕
- Service Worker
- App Shell 缓存
- 公共内容缓存
- 离线读取儿童档案
- 离线查看已缓存地点
- 离线查看已缓存知识和政策

## 10.2 缓存策略

```text
App Shell
- Cache First

Public Content
- Stale While Revalidate

API Authentication
- Network Only

Children Local Data
- IndexedDB Only
```

## 10.3 离线限制

离线时允许：

- 查看儿童资料
- 编辑儿童资料
- 查看缓存内容
- 查看收藏
- 执行本地匹配

离线时不允许：

- 登录
- 更新公共内容
- 获取实时天气
- 获取实时营业状态

---

# 11. 前端页面范围

```text
/
├── onboarding
├── home
├── places
│   ├── map
│   └── :placeId
├── children
│   ├── new
│   └── :childId/edit
├── knowledge
│   └── :knowledgeId
├── policies
│   └── :policyId
├── login
├── profile
└── settings
```

## 11.1 首页

首页优先展示：

1. 今天去哪玩
2. 当前儿童
3. 本周育儿知识
4. 政策提醒
5. 本地数据状态

不得设计成无限信息流。

## 11.2 未登录模式

未登录用户也必须能：

- 创建儿童档案
- 获取推荐
- 查看知识
- 查看政策
- 收藏地点

登录入口不得阻断核心流程。

## 11.3 数据提示

设置页必须明确展示：

```text
儿童资料仅保存在当前设备。
清除浏览器数据或更换设备可能导致资料丢失。
```

---

# 12. 导入、导出与备份

## 12.1 First Release 必须支持

由于数据不上传服务器，必须提供：

- 导出本地数据
- 导入本地数据
- 删除全部本地数据

推荐格式：

```text
JSON Backup
```

## 12.2 导出结构

```ts
type LocalBackup = {
  app: 'kodoko';
  version: number;
  exportedAt: string;
  children: ChildProfile[];
  preferences: UserPreference[];
  favorites: FavoritePlace[];
  knowledgeProgress: KnowledgeProgress[];
  policyTasks: PolicyTaskState[];
};
```

## 12.3 导入要求

导入必须：

- 校验 Schema
- 校验版本
- 防止原型污染
- 防止任意脚本内容
- 提供覆盖或合并选项
- 导入前生成临时备份
- 失败时保持原数据

---

# 13. API 规范

## 13.1 基础约定

- 前缀：`/api/v1`
- JSON：camelCase
- 数据库：snake_case
- 时间：ISO 8601
- 服务端存 UTC
- ID：UUID 或 UUIDv7
- 分页：Cursor Pagination

## 13.2 First Release API

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/session

GET    /api/v1/me
PATCH  /api/v1/me

GET    /api/v1/places
GET    /api/v1/places/:placeId

GET    /api/v1/knowledge
GET    /api/v1/knowledge/:knowledgeId

GET    /api/v1/policies
GET    /api/v1/policies/:policyId

GET    /api/v1/content/version
GET    /api/v1/health
```

明确禁止：

```text
POST /children
GET /children
POST /child-profile
POST /recommendation-profile
```

## 13.3 错误格式

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required.",
    "details": {},
    "requestId": "..."
  }
}
```

---

# 14. 多语言

First Release：

- 日语
- 简体中文
- 繁体中文

使用：

- i18next
- react-i18next

约束：

- UI 文案不得硬编码
- 政策翻译注明非官方翻译
- 重要政策保留官方日文来源
- 内容与 UI 翻译分离
- 本地数据不因切换语言而复制

---

# 15. AI 使用规范

## 15.1 First Release

AI 仅用于内部辅助：

- 内容摘要草稿
- 翻译草稿
- 地点标签建议
- 政策结构化提取草稿
- 测试数据生成
- 代码生成
- 代码评审

## 15.2 禁止事项

AI 不得：

- 读取儿童本地数据库并上传内容
- 将儿童资料发送到第三方模型
- 生成医疗诊断
- 承诺政策资格
- 自动发布未经审核政策
- 将本地数据用于模型训练

## 15.3 未来 LLM 接入

未来接入 LLM 必须：

- 用户主动触发
- 明确告知发送内容
- 最小化数据
- 支持脱敏
- 使用 Provider Interface
- 使用结构化输出
- 记录 Prompt 版本
- 提供非 AI 回退
- 创建 ADR

---

# 16. 隐私与安全

## 16.1 儿童数据

儿童数据：

- 仅 IndexedDB
- 不进入 API
- 不进入日志
- 不进入分析平台
- 不进入崩溃报告
- 不进入第三方 AI
- 不进入 URL
- 不进入 localStorage

## 16.2 浏览器安全

必须实现：

- CSP
- XSS 防护
- 安全依赖检查
- Trusted Types 可行性评估
- 导入文件 Schema 校验
- Service Worker 更新策略
- HTTPS Only

## 16.3 分析平台

允许收集：

- 页面访问
- 功能点击
- 匿名错误
- 粗粒度设备信息

禁止收集：

- 儿童昵称
- 出生日期
- 月龄
- 兴趣
- 政策匹配结果
- 精确位置
- IndexedDB 内容

## 16.4 地理位置

用户位置：

- 仅在明确授权后读取
- 优先在内存使用
- 默认不持久化精确坐标
- 不发送到分析平台
- 允许用户手动选择地区
- 服务端查询可使用降精度坐标

---

# 17. 测试策略

## 17.1 必测内容

- 月龄计算
- 闰年生日
- 时区边界
- IndexedDB CRUD
- IndexedDB Migration
- 备份导入导出
- 推荐评分
- 政策匹配
- 离线模式
- PWA 更新
- 登录 Session
- 未登录完整流程
- 数据删除
- 多语言回退

## 17.2 E2E 核心流程

1. 未登录进入首页
2. 创建儿童档案
3. 获取地点推荐
4. 查看地点详情
5. 查看年龄匹配知识
6. 查看本地匹配政策
7. 刷新页面后数据仍存在
8. 离线后仍能读取档案
9. 导出备份
10. 删除本地数据
11. 导入备份恢复
12. 登录但儿童数据不上传

---

# 18. React 代码规范

## 18.1 TypeScript

- strict
- 禁止无说明的 any
- 外部数据使用 unknown
- Zod 校验所有 API 和导入文件
- Domain 类型与 API DTO 分离
- 禁止重复定义核心领域类型

## 18.2 React

- Function Component
- Hooks
- 组件保持纯粹
- 业务规则放 domain package
- IndexedDB 逻辑放 local-db package
- 推荐逻辑放 recommendation package
- 政策逻辑放 policy-engine package
- 页面组件只负责编排

## 18.3 Hook 规范

推荐：

```text
useChildren
useChildProfile
usePlaceRecommendations
useKnowledgeForChild
usePolicyMatches
useLocalBackup
useAuthSession
```

Hook 不得隐藏高风险副作用。

## 18.4 目录建议

```text
apps/web/src/
├── app/
├── routes/
├── components/
├── features/
│   ├── auth/
│   ├── children/
│   ├── places/
│   ├── knowledge/
│   └── policies/
├── hooks/
├── lib/
└── styles/
```

---

# 19. Agent 开发流程

## 19.1 修改前

Agent 必须：

1. 阅读 AGENTS.md
2. 确认任务属于 First Release
3. 判断数据是 Local State 还是 Server State
4. 检查是否会上传儿童数据
5. 检查是否影响 IndexedDB Schema
6. 检查是否影响离线能力
7. 先给出简短实施方案

## 19.2 修改中

必须：

- 最小化变更范围
- 复用现有领域逻辑
- 不直接访问 IndexedDB
- 不直接在组件中调用 fetch
- 不将儿童数据加入 API 参数
- 不引入云同步
- 不静默修改本地 Schema
- 不静默修改认证方式

## 19.3 修改后

执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

涉及用户流程：

```bash
pnpm test:e2e
```

涉及本地数据：

```bash
pnpm test:local-db
pnpm test:migrations
```

Agent 必须如实说明实际执行结果。

---

# 20. Git 与 PR

## 20.1 Commit

```text
feat(children): add local child profile storage
feat(places): add client-side recommendation scoring
fix(local-db): preserve profiles during schema migration
test(policy): add municipality matching cases
docs(agents): define local-first privacy boundary
```

## 20.2 PR 必须包含

- 背景
- 修改内容
- 是否涉及儿童数据
- 是否涉及 IndexedDB
- 是否涉及 API
- 是否改变本地数据格式
- 测试结果
- 回滚方式
- 截图或录像

---

# 21. CI/CD

GitHub Actions：

## Pull Request

- install
- lint
- typecheck
- unit test
- local-db migration test
- build
- E2E changed scope
- dependency license check

## Main

- 全量测试
- 构建
- 部署 staging
- Smoke Test

## Release

- 人工批准
- 公共数据库迁移检查
- 发布 production
- 验证 PWA
- 验证 Service Worker 更新
- 验证登录
- 验证未登录模式

---

# 22. License

主项目：

```json
{
  "private": true,
  "license": "UNLICENSED"
}
```

要求：

- Private Repository
- All Rights Reserved
- 维护 THIRD_PARTY_NOTICES.md
- 禁止擅自改为 MIT
- 禁止引入未经评估的强 Copyleft 依赖
- 通用模块未来可拆分为 MIT 或 Apache-2.0

---

# 23. First Release 里程碑

## Sprint 0：工程基础

- React + Vite
- Monorepo
- CI
- Design Token
- i18n
- Router
- Error Monitoring
- PWA 基础

## Sprint 1：Local-first 基础

- Dexie
- 本地数据库
- Repository
- Schema Version
- 数据删除
- 导入导出

## Sprint 2：儿童档案

- Onboarding
- 创建儿童
- 编辑儿童
- 月龄计算
- 儿童切换
- 本地持久化

## Sprint 3：地点

- 地点列表
- 地点详情
- 地图
- 筛选
- 公共 API
- 内容缓存

## Sprint 4：今天去哪玩

- 客户端评分
- 年龄匹配
- 距离匹配
- 天气权重
- 推荐理由
- 离线回退

## Sprint 5：育儿知识

- 年龄匹配
- 内容详情
- 多语言
- 来源
- 已读状态

## Sprint 6：政策提醒

- 政策规则
- 客户端匹配
- 自治体筛选
- 提醒状态
- 截止日显示
- 免责声明

## Sprint 7：登录

- Email / Google
- Session
- Profile
- 未登录模式
- 登录后本地数据不上传验证

## Sprint 8：发布

- E2E
- 可访问性
- 性能
- 安全
- 隐私政策
- 用户测试
- Production

---

# 24. Definition of Done

任务完成必须满足：

- 符合 First Release
- 儿童数据未上传
- 类型检查通过
- Lint 通过
- 测试通过
- 本地数据迁移已覆盖
- 离线状态已考虑
- 空状态完整
- Loading 状态完整
- 错误状态完整
- 多语言完整
- 可访问性达标
- API Schema 已更新
- 隐私风险已检查
- 文档已更新
- 可回滚

---

# 25. Agent 禁止事项

Agent 不得：

- 创建儿童服务端 API
- 将儿童档案上传服务器
- 将儿童数据放入 localStorage
- 将儿童数据放入 URL
- 将儿童数据发送给分析平台
- 将儿童数据发送给 AI
- 把登录设为强制
- 提前加入云同步
- 提前加入家庭共享
- 擅自引入微服务
- 擅自引入 GraphQL
- 在组件中直接访问 Dexie
- 绕过 Schema 校验
- 静默清空本地数据库
- 破坏旧版本数据
- 删除失败测试
- 改变 License 策略
- 替换核心技术栈而不写 ADR

---

# 26. Architecture Decision Record

以下变更必须创建 ADR：

- 更换 React 技术栈
- 更换 IndexedDB 封装
- 新增儿童云同步
- 新增家庭共享
- 上传儿童照片
- 上传儿童出生日期
- 引入 LLM
- 引入精确位置存储
- 更换认证系统
- 引入新的云供应商
- 修改 License

ADR 示例：

```text
0001-use-react-and-vite.md
0002-store-child-data-in-indexeddb.md
0003-keep-first-release-local-first.md
0004-limit-backend-to-auth-and-public-content.md
```

---

# 27. 最终判断标准

遇到多个实现方案时，按以下顺序判断：

1. 是否能避免上传儿童数据
2. 是否保护用户隐私
3. 是否符合 Local-first
4. 是否符合 First Release
5. 是否容易测试
6. 是否容易迁移
7. 是否可离线使用
8. 是否维护成本低
9. 是否容易回滚
10. 是否代码更少

本项目 First Release 的核心目标是：

> 让家长在不上传儿童资料的前提下，快速知道今天带孩子去哪里，以及当前年龄阶段最值得关注的育儿知识和政策。
