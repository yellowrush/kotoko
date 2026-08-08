# 开发计划：地点纠错 → GitHub Issue → AI 修复流水线

> 状态：待评审（Draft）
> 关联流程参考：https://github.com/yellowrush/drag-up/blob/develop/.github/workflows/kid-idea-agent.yml

---

## 1. 背景与目标

### 1.1 现状

地点详情页已具备「报告信息修正」完整链路：

```text
PlaceReportDialog (apps/web/src/components/places/PlaceReportDialog.tsx)
  └─ submitReportWithQueue (apps/web/src/lib/reportQueue.ts)   // 离线队列 + 自动补发
       └─ POST /api/v1/places/:placeId/reports (apps/api/src/routes/reports.ts)
            └─ 内存 reportStore（限流：每 IP 10 分钟 5 条）
```

问题：报告只存在 API 进程内存中（Vercel 环境下会随实例回收丢失），缺少「人工审阅 → 修复 → 回写数据」的闭环。

### 1.2 目标

参考 drag-up 的 `kid-idea-agent.yml` 管理流程，在 kotoko 中实现：

1. 用户在地点详情页提交纠错报告后，由**后端**自动在 `yellowrush/kotoko` 仓库创建一条结构化 GitHub Issue；
2. 人工在 Issue 上审核（补充说明 / 打标签）；
3. 审核通过后，在 Issue 评论中输入命令（如 `/fix`、`/opencode`），触发 GitHub Actions 将任务交给 AI Agent；
4. AI Agent 依据报告内容修复地点数据并提交 PR；
5. 人工 review PR 后合并，纠错闭环完成。

## 2. 端到端流程

```text
地点详情页（用户）
   │ 填写类型/详情/联系方式
   ▼
POST /api/v1/places/:placeId/reports  (apps/api)
   │ ① 校验 + 限流（已有,保留）
   │ ② 写入内存报告队列（已有,保留）
   │ ③ 调用 GitHub API 创建 Issue     ← 新增
   ▼
yellowrush/kotoko Issue #N（模板自动生成：地点、类型、详情）
   │ 人工审核：补充说明、打 label
   ▼
Issue 评论 /fix（或 /codex /opencode）
   ▼
GitHub Actions: issue-agent.yml（新增，移植自 drag-up）
   ├─ 解析命令 → 选择 Agent
   ├─ 构建 Issue 上下文（Body + 全部评论）
   ├─ Agent 生成代码/数据修改 → 创建分支 + PR（base: develop）
   ▼
人工 review PR → 合并 → 地点数据更新 → 发布
```

## 3. 阶段划分与任务拆解

### Phase 1：后端 Issue 桥接（apps/api）

| # | 任务 | 说明 |
|---|------|------|
| 1.1 | 新增 GitHub Issue 服务模块 | `apps/api/src/lib/github.ts`：封装 Octokit，`createReportIssue(report)`。仓库、token 从环境变量读取（`GITHUB_ISSUE_REPO`、`GITHUB_TOKEN`） |
| 1.2 | 报告创建时联动建 Issue | `apps/api/src/routes/reports.ts` 中 `reportStore.push` 之后调用；GitHub 失败不阻断主流程（报告仍入内存队列，并记录 `issueError` 便于排查） |
| 1.3 | Issue 模板 | 标题：`[地点报告] {Place名称} - {报告类型}`；Body 包含：[报告类型、地点名称、地点 ID、API 详情链接、详情文本（<2000 字符）、locale、发生时间]；文本包进 markdown code block + HTML 转义，防脚本注入 |
| 1.4 | 隐私处理 | `contactEmail` 默认**不进 Issue 正文**，仅存在于内存记录与后续 admin 视图；Issue 内提示「联系方式仅供后台联系，已隐藏」 |
| 1.5 | Labels | `report` + `report:{type}`（business_hours/price/reservation/address/media/outdated/closed/other） |
| 1.6 | 限流防刷 | 保留 IP 10 分钟 5 条；新增「每日全局限量」（如 100 条/日）防止 Issue 刷屏，超限返回 429 并记录 |
| 1.7 | 幂等/去重 | 同一 placeId+detail 哈希 24h 内重复报告直接合并进原 Issue 评论，不新建 Issue |
| 1.8 | 单测 | mock Octokit：成功 / token 缺失 / API 400 / 注入内容转义；路由测试覆盖 | 

### Phase 2：人工审核约定

| # | 任务 | 说明 |
|---|------|------|
| 2.1 | Issue 模板尾部附审核指引 | Issue Body 末尾固定区块：「审核通过后请评论 `/fix`，或 `/codex` / `/opencode` 指定其他 Agent；不同意请关闭并附理由」 |
| 2.2 | label 流转规范 | 新报告=`report`；人工确认可修复=`report:verified`；不可修复/关闭=`report:rejected`；已合并=`report:done` |
| 2.3 | 文档 | `docs/product/` 下记录操作手册（谁、何时、如何触发） |

### Phase 3：AI Agent 工作流（.github/workflows）

| # | 任务 | 说明 |
|---|------|------|
| 3.1 | 新增 `report-agent.yml` | 事件：`issue_comment`（created）+ `workflow_dispatch`（兜底手动触发）；permissions：`contents: read`、`issues: write`、`pull-requests: write` |
| 3.2 | 命令解析 | 首个脚本复用 drag-up 的 parse 模式：`/git`、`/hum`（即 `/fix`）→ Agent 选择；建议命令集：`/codex`、`/opencode`、`/fix`（默认 copilot） |
| 3.3 | Agent 执行路径（三选一，见 §4 决策） | ① GitHub Copilot coding agent（`agent_assignment` API）② Codex ③ DeepSeek diff 生成（拖入参考工作流自带逻辑） |
| 3.4 | 自定义指令 | 注入系统：```Follow AGENTS.md```、`This is a place data correction for kotoko`、`只修改本 issue 相关的最小范围`、`地点数据在 apps/api/src/data/*.json`、`运行 pnpm lint / typecheck / test`、`不要改动认证/基础设施/私有数据`、`不要发布 production` |
| 3.5 | 分支与 PR | 分支 `fix/report-issue-#-{short-topic}`，base=`develop`；PR Body 必须包含：Before/After 对照、修改文件清单、`Closes #N`、测试结果、声明「不涉及儿童数据 / IndexedDB Schema」 |
| 3.6 | 失败回退 | diff 应用失败时，将生成内容附评论并警告人工处理（移植 drag-upload 输出模式） |
| 3.7 | 新增工作流测试 | 用 `workflow_dispatch` 手工验证整链路（无合入主分支） |

### Phase 4：验证、部署与文档

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 环境变量 | Vercel（apps/api）新增 `GITHUB_TOKEN`、`GITHUB_ISSUE_REPO=yellowkiwi/kotoko`；GitHub Secrets 配置部署 token 权限仅 `Issues: write`（fine-grained PAT） |
| 4.2 | E2E | PlaceDetailPage → 提交纠错 → 断言 API 返回 success；本地 mock 网络与真实情况 |
| 4.3 | 安全审查 | Issue 内容 sanitize、token 最小权限、日志不输出报序内容 |
| 4.4 | 文档更新 | `docs/api/README.md` 补充报告→Issue 说明；`AGENTS.md` 用户流程补充（可选） |
| 4.5 | 上线检查 | 先 staging 环境验证一条真实报告生成 Issue → review → `/fix` → PR 合入 → 验证 JSON 数据已更新 |

## 4. 关键设计决策（需确认）

| 决策点 | 选项 A（推荐） | 选项 B | 选项 C |
|---|---|---|---|
| **Agent 执行方式** | GitHub Copilot coding agent（actions 内一步 assign，支持私有仓库，无需额外 API Key） | Codex（需要 `COPILOT_AGENT_TOKEN` 等价高权限 token） | DeepSeek diff 生成（参考 drag-上传 的 `opencode` 路径，需要 `API_KEY`；对仓库上下文理解有限，适合小改动） |
| **Issue 创建入口** | API 服务端持有 token 自动创建（统一限流/sanitize，安全） | 前端直连 GitHub API（必须暴露 token，不安全，不推荐） | 后台 `apps/cmichael admin` 手动创建（缺少自动性） |
| **报告与 Issue 关系** | 每条有效报告 = 1 条 Issue（推荐，简单可追溯） | 同类型聚合为一周汇总 Issue | 进入测试环境先行 |
| **contactEmail 可见性** | 不可进 public issue（推荐，隐私） | 可见（便于直接联系，不推荐） | 仅对 owner 可见 |

## 5. 时间估算

| 阶段 | 人日（约） |
|---|---|
| Phase 1 Issue 桥接 | 2 |
| Phase 2 审核规范 | 1 |
| Phase 3 工作流 | 2 |
| Phase 4 验证与部署 | 1.5 |
| 合计 | 6～7 |

## 6. 验收标准（DoD）

- [ ] 提交纠错后 API 在 yellowkiwi/kotoko 生成结构化 Issue（标题/主文/labels 正确）
- [ ] GitHub API 不可用时主流程不崩溃，报告不丢失
- [ ] 重复/伪造/注入内容被拦截（限流、每日上限、转义）
- [ ] Issue 评论 `/fix` 触发 Actions，成功产出 PR（base develop）
- [ ] PR 通过 CI（lint/typecheck/test/build），合并后地点 JSON 生效
- [ ] 「联系邮箱」未出现在任何 Issue
- [ ] `workflow_dispatch` 兜底可用

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| GitHub token 泄露 | fine-grained token，仅 `issues: write`，Vercel/Secrets 短期轮换 |
| 大量冒名报告刷 Issue | 限流 + 每日上限 + 去重；异常可在 Actions 或 admin 转手动 |
| Agent 改动越界 | custom_instructions 收紧范围；PR 必须人工评审；不自动合并 |
| 报告内容涉及儿童隐私 | reportBodySchema 已限制字段，仅允许 type/detail/contactEmail；论坛文本转义；不做儿童数据判断 |
| Vercel 实例缺失状态 | 内存队列仅保留「已建 Issue」确认，Issue 本身即持久记录（来源） |