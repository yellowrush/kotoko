# Tokyo Event Collection Workflow

本工作流用于每天早上自动收集东京都内适合家庭参考的公共活动候选，包括祭り、亲子/育儿活动、フリーマーケット/バザー、季节活动和儿童友好活动。

## 边界

- 只处理公共活动数据，不读取、不上传、不推断儿童档案、兴趣、年龄、位置或 IndexedDB 内容。
- 默认只收集东京都内公开来源。扩大到神奈川、千叶、埼玉前需要更新来源配置和审核规则。
- 抓取结果先进入候选数据，不直接发布到 `seedPlaces`。发布前需要人工确认来源、日期、地点和亲子适配性。
- 商业 API 只有在确认授权、费用、归属和再发布条件后才启用。
- 网页抓取只保留结构化摘要和来源 URL，不复制整篇正文或图片。

## 数据来源分层

1. 官方开放数据：优先使用東京都オープンデータカタログ和区市町村 CSV/API。许可通常是 CC BY，需要保留来源和取得时间。
2. 官方活动页面：区役所、文化设施、公园、児童館、图书馆、观光协会页面。若无结构化数据，只生成待审核候选。
3. 授权商业源：例如 EventBank 的文件/API 数据服务。启用前必须配置密钥和许可说明，不把密钥提交到仓库。

## 每日执行

推荐在 GitHub Actions 中按日本时间每天 06:30 执行：

```text
21:30 UTC = 06:30 JST
```

流程：

1. 拉取来源配置。
2. 从东京开放数据 CKAN API 搜索活动相关数据集。
3. 下载 CSV/JSON 资源并标准化为候选项。
4. 按关键词分类：`festival`、`parenting`、`flea-market`、`seasonal`、`child-friendly`。
5. 去重：优先使用来源 URL + 标题 + 开始日期 + 区市町村；无日期时进入低置信度候选。
6. 过滤：只保留未来 45 天内或无明确结束日期但来源近期更新的候选。
7. 输出 `tokyo-event-candidates.json` artifact。
8. 若候选不为空，创建或更新 GitHub Issue，等待人工审核后转成公共 place/event 数据。

## 候选数据结构

```ts
type TokyoEventCandidate = {
  id: string;
  title: string;
  category: 'festival' | 'parenting' | 'flea-market' | 'seasonal' | 'child-friendly' | 'general';
  startsAt?: string;
  endsAt?: string;
  venueName?: string;
  address?: string;
  municipalityCode?: string;
  latitude?: number;
  longitude?: number;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  confidence: 'high' | 'medium' | 'low';
  reviewNotes: string[];
};
```

## 审核到发布

人工审核后才可以把候选转为公共内容：

- 一次性/短期活动进入 `event` 类公共地点或后续独立 events 模型。
- 定期市场、长期活动会场可进入 `apps/api/src/data/places/` 的 `event` 或 `shop` 分类。
- 必须填入 `sourceUrl`、`sourceCheckedAt`、`status: 'published'`，并保留 `provenance`。
- 不确定儿童友好性时保持 `draft`，不要为了数量发布低质量内容。

## 后续演进

- 若活动数量明显增长，应新增独立 `Event` 领域模型和 `/api/v1/events` 公共 API，而不是把所有短期活动塞进 `Place`。
- 若接入 EventBank 等商业源，需要新增 ADR，说明授权、费用、缓存、归属展示和撤稿策略。
- 若自动生成 PR，应让 PR 只包含公共候选数据和来源，不包含用户数据、日志或密钥。
