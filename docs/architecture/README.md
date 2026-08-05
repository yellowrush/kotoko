# Architecture

Kodoko First Release 架构总览。

## 核心原则

- Local-first：儿童资料只在设备本地。
- 后端最小化：仅认证与公共内容。
- 隐私默认开启。
- 未登录可用。

## 模块划分

```text
apps/web                      React Web / PWA
apps/api                      Fastify 最小 API（认证占位 + 公共内容）
packages/domain               领域模型与规则（月龄计算、地点/知识/政策类型）
packages/local-db             IndexedDB 封装（Schema 迁移 + Repository + 备份导入导出）
packages/recommendation       客户端推荐评分
packages/policy-engine        客户端政策匹配规则（无动态 JS）
packages/api-client           API Client
packages/i18n                 多语言资源（ja / zh-CN / zh-TW）
packages/config               TypeScript / ESLint / Vitest 共享配置
packages/ui                   共享 UI 组件
```

## 数据流

```text
Server State   -> TanStack Query 缓存公共内容（地点/知识/政策/版本）
Local State    -> Dexie (kodoko-local) 持久化儿童/偏好/收藏
Ephemeral UI   -> Zustand 应用级 + 组件级状态
```

推荐与政策匹配均在客户端执行，服务端不接收儿童数据。