# 0004 - Limit backend to auth and public content

- **Status**: Accepted
- **Date**: 2026-08-05

## Context

为避免为未来扩展提前引入复杂云端数据模型（AGENTS.md §26），后端范围必须最小化。

## Decision

- 后端模块仅：`AuthModule`、`UsersModule`、`ContentModule`、`PlacesModule`、`PoliciesModule`、`KnowledgeModule`、`HealthModule`。
- 明确不包含：`ChildrenModule`、`ChildSyncModule`、`FamilyModule`、`GrowthModule`、`MedicalModule`。
- API 前缀 `/api/v1`，错误格式结构化。
- 服务端只接收公共查询条件（如纬度 / 经度 / 半径 / 类别 / locale），不接收儿童标识与画像。

## Consequences

- 前端承担推荐与政策匹配逻辑（`@kodoko/recommendation`、`@kodoko/policy-engine` 在客户端执行）。
- 后端部署与安全面显著缩小。
- 需要登录能力时（Sprint 7）再按 ADR 扩展认证模块。