# 0003 - Keep First Release local-first

- **Status**: Accepted
- **Date**: 2026-08-05

## Context

产品核心承诺是「不上传儿童资料」。需要明确的数据边界与默认行为。

## Decision

- 儿童资料默认只在设备本地（IndexedDB）。
- 后端只提供登录、账号身份与公共数据（地点 / 知识 / 政策 / 内容版本）。
- 未登录用户可完整使用核心功能；登录不是前置条件。
- 明确禁止的服务端接口：`POST /children`、`GET /children`、`POST /child-profile`、`POST /recommendation-profile`。
- 云同步仅可通过用户显式 Opt-in（未来经 ADR 再启用），不得随应用升级自动开启。

## Consequences

- 隐私默认满足，减少合规负担。
- 必须提供本地数据导出 / 导入 / 删除能力以应对数据丢失场景。