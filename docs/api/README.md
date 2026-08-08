# API

See [place-report-issues.md](place-report-issues.md) for the public place report to GitHub Issue workflow.

后端 API 规范。前缀 `/api/v1`，JSON camelCase，时间 ISO 8601，错误格式结构化。

## First Release 接口范围

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/session

GET    /api/v1/me
PATCH  /api/v1/me

GET    /api/v1/places
GET    /api/v1/places/:placeId
POST   /api/v1/places/:placeId/reports

GET    /api/v1/knowledge
GET    /api/v1/knowledge/:knowledgeId

GET    /api/v1/policies
GET    /api/v1/policies/:policyId

GET    /api/v1/content/version
GET    /api/v1/health
```

## 明确禁止

```text
POST /children
GET /children
POST /child-profile
POST /recommendation-profile
```

服务端不接收儿童标识、出生日期、兴趣、无障碍需求等儿童数据。
