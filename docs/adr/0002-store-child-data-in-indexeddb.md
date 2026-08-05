# 0002 - Store child data in IndexedDB (local-first)

- **Status**: Accepted
- **Date**: 2026-08-05

## Context

儿童资料默认不上传服务器。必须选择本地持久化方案，支持结构化查询、版本化 Schema 与迁移。

## Decision

- 使用 **IndexedDB**，通过 **Dexie.js** 封装。
- 数据库名：`kodoko-local`。
- 所有 IndexedDB 访问必须经过 `@kodoko/local-db`（Repository 接口），组件禁止直接操作 Dexie。
- 禁止仅使用 localStorage 存储儿童档案。

## Consequences

- 结构化查询与迁移能力满足 Local-first 需求。
- 提供导出 / 导入 / 删除全部数据能力（见 ADR-0003 配套）。
- Schema 变化必须增加版本号并编写迁移，不得静默清空。