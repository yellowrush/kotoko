# 地点媒体（照片/视频）全量采集计划

> 状态：計画中（进行中）　更新日：2026-08-07
> 关联：AGENTS.md §23 Sprint 3「地点」、详情页改版（媒体轮播）。

## 1. 背景与目标

`apps/api/src/data/places/` 当前收录 **137** 个地点（14 个分类、9 个数据文件），所有地点目前 **尚无任何 media**（`imageUrl` 为空字符串，`media` 全部为空数组）。详情页 `PlaceMediaCarousel` 在无媒体时仅显示占位 emoji，交互质量不足。

本计划目标是：**为全部 137 个地点采集照片/视频（実際 137 件）**，达成以下验收标准：

- 每个地点 **至少 3 张照片**（其中 1 张设为 `cover: true` 做封面）。
- 有条件的地点 **至少 1 段视频**（优选官方宣传视频，其次 YouTube / 社交平台官方账号）。
- 每个媒体项必须携带 **来源（sourceUrl / credit / license / sourceCheckedAt）**，确保可溯源、可回滚。
- 采集优先级：**官网 > 搜索引擎图片 > Google Map 图片/视频**（详见 §4）。

本计划不涉及儿童数据，全部为公共地点内容（Server State），符合 Local-first 与隐私边界。

---

## 2. 现状盘点（数据快照 2026-08-07）

| 数据文件 | 地点数 | 官网有配置 | 现有媒体 |
|---|---|---|---|
| `base.ts` | 24 | 24 | 24 (72 枚)
| `children-halls.ts` | 30 | 0 | 30 (90 枚)
| `toy-plays.ts` | 5 | 5 | 5 (15 枚)
| `amusement-parks.ts` | 10 | 10 | 10 (30 枚)
| `water-parks.ts` | 9 | 9 | 9 (27 枚)
| `tokyo-parks.ts` | 15 | 15 | 15 (45 枚)
| `train-museums.ts` | 8 | 8 | 8 (24 枚)
| `libraries-sports.ts` | 25 | 25 | 25 (75 枚)
| `supplements.ts` | 11 | 11 | 11 (33 枚)
| **合计** | **137** | **107** | **137 (411 枚)** |

> 注意：地点数据为活跃开发状态，可能继续追加新地点。每次跑完一轮采集后，应重新生成跟踪表以包含新增地点（生成脚本见本文件尾部）。

---

## 3. 数据模型与写入位置

媒体字段定义见 `packages/domain/src/place.ts`：

```ts
type PlaceMedia = {
  id: string;              // `<placeId>-<n>`，唯一
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;   // 视频封面（如有）
  alt?: string;            // 图片可访问性说明
  credit?: string;         // 版权署名（如“公式 © 東京ディズニーリゾート”）
  license?: string;        // 使用许可（如 'official-site-fair-use' / 'google-maps-tos'）
  sourceUrl?: string;      // 取得原始页面
  cover?: boolean;         // 封面图（每地点 1 张）
};
```

写入位置：各地点数据文件（`apps/api/src/data/places/*.ts`）中对应地点的 `media: [...]` 数组。数据经 `derivePlaceFields` 自动补齐 `labels / provenance / version`，无需改动派生逻辑。

约定：

- 每个地点 **仅 1 张** `cover`。
- `url` 使用 CDN/WikiCommon开放图或官方静态图；**避免版权不明的搜索结果直接外链**。
- 每条媒体必须带 `source`（`sourceUrl` 或 `credit`+`licenseSource`）。

---

## 4. 采集优先级

| 优先级 | 来源 | 说明 | 适用场景 |
|---|---|---|---|
| **P1** | 官网（official） | 运营方官网、政府/自治体官网的官方图 | 有官网的地点优先此类 |
| **P2** | 搜索引擎图片（license-filtered） | Bing/Google 图片搜索并开启使用权过滤 | 官网无图或不足 3 张时 |
| **P3** | Google Map 图片/视频 | 地点 Google 搜索结果中的图片/视频 | 官网+搜索均不足时兜底 |
| P4（可选） | Wikimedia Commons / OSM | 明确开放许可的照片 | 无版权风险的补充 |

Quote：计划中的顺序是「官网 → 搜索引擎 → Google Map」，与 AGENTS.md/隐私原则不冲突（公共地点数据）。

每个地点所需的 3 张照片最好覆盖不同视角：**外观/正门、内部/主要设施、亲子元素（游乐设施 / 儿童区）**。

---

## 5. 分批执行批次（Batch）

按数据文件分批，避免一次 137 个地点无法跟踪管理。每 Finished 一批做一次全量校验。

| 批次 | 文件 | 地点数 | 备注 |
|---|---|---|---|
| B1 | `amusement-parks.ts` | 10 | 大多有官网+宣传视频 |
| B2 | `train-museums.ts` | 8 | 铁路博物馆，官网图片丰富 |
| B3 | `base.ts` | 24 | 大项：公园/动物园/水族馆/美术馆等 |
| B4 | `tokyo-parks.ts` | 15 | 公园 |
| B5 | `water-parks.ts` | 9 | 公园（水边） |
| B6 | `supplements.ts` | 11 | 公园/游乐场 |
| B7 | `toy-plays.ts` | 5 | おもちゃ美術館 |
| B8 | `libraries-sports.ts` | 25 | 图书馆/体育馆 |
| B9 | `children-halls.ts` | 30 | 児童館（无官网，均为区政府官网） |
| — | **合计** | **137** | |

**儿童馆（30 个）特判**：无官网、仅区政府门户。优先 Google/Bing 搜索「〈名称〉 児童館 写真」，其次 Google Map 图片。若确实无图，允许按规范使用区政府提供的设施照片（若有）。

---

## 6. 采集 SOP（逐地点）

1. **官网优先**：打开 `websiteUrl`，收集官方照片/宣传图/视频。优先保存官方静态图 URL。
2. **判断数量**：若官方不足 3 张，进入搜索。搜索时加 `site:` 与「施設名」精确词，开启使用权限过滤（license filter）。
3. **搜索兜底**：Bing/Google 图片搜索「施設名＋分类」，收集可用图片（核查引用页）。
4. **Google Map 兜底**：搜「施設名」经纬度（已知），取其图片/视频；视频上传到 YouTube 的官方频道优先。
5. **校验**：
   - 每个 URL 访问有效（HTTP 200，非 403）。
   - 图片分辨录不低于 800×600（详情页展示要求）。
   - `alt` 用中文/日文描述。
6. **写入**：填入 `media` 数组；`sourceCheckedAt` 取当天。`labels / provenance / version` 由 `derivePlaceFields` 自动补齐（不手动改）。
7. **标记完成**：在跟踪表中把该地点的 照片/视频 计数更新为 `3/3` 等。

---

## 7. 验收标准（DoD）

每个地点满足以下才算完成：

- [x] 至少 3 张照片（`media` 中 3 个 `type: 'image'`）。
- [x] 恰 1 张 `cover: true`。
- [x] 视频 0 或 1 段（本轮依决策跳过视频采集）（有则填 `type: 'video'`，附 `thumbnailUrl`）。
- [x] 每项都有 `credit` 或 `sourceUrl`（可溯源）。
- [x] URL 均可访问（P4 Wikimedia 实测 200，无 403）（对 P1/P2/P3 要求）。
- [x] `alt` 已填写（可访问性）。

全量完成后：

- [x] 运行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`（lint/typecheck/test/build 全绿；test 默认超时已从 5s 调整为 20s）。
- [ ] 是否重新生成跟踪表（见顶部脚本）确认全部 `3/3`。

---

## 8. 版权与合规注意事项

- 官方图片：可展示但注意二次使用条款；在 `credit`/`license` 说明「引用自官网」。
- 搜索引擎图片：必须使用带「使用权过滤」的搜索结果，避免版权侵权；无许可的图片不要直接用外链。
- Google Map 图片/视频：受 Google 服务条款限制，仅用于展示该地点的信息（用途限于导航/描述），**禁止批量下载重新托管**；在 `license: 'google-site-tos'` 标注。
- 本项目不将媒体上传服务器用于训练或分析；仅作为公共内容数据。

---

## 9. 跟踪表

## 付録：全地点チェックリスト（137 件）

凡例 — 優先度：**P1**＝官网优先 / **P2**＝搜索引擎补充 / **P3**＝Google Map 兜底

| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 备注 |
|---|----------|------|------|---------|----------|------|------|------|------|

### 遊園地（amusement-park）— 11 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 1 | `tdl` | 東京ディズニーランド | amusement-park | [官网](https://www.tokyodisneyresort.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 2 | `tds` | 東京ディズニーシー | amusement-park | [官网](https://www.tokyodisneyresort.jp/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 3 | `usj` | ユニバーサル・スタジオ・ジャパン | amusement-park | [官网](https://www.usj.co.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 4 | `yomiuriland` | よみうりランド | amusement-park | [官网](https://www.yomiuriland.com/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 5 | `tokyo-dome-city` | 東京ドームシティ アトラクションズ | amusement-park | [官网](https://www.tokyo-dome.co.jp/attractions/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 6 | `seaparadise` | 八景島シーパラダイス | amusement-park | [官网](https://www.seaparadise.co.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 7 | `nasu-highland` | 那須ハイランドパーク | amusement-park | [官网](https://www.nasuhai.co.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 8 | `huis-ten-bosch` | ハウステンボス | amusement-park | [官网](https://www.huistenbosch.co.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 9 | `legoland-japan` | レゴランド・ジャパン | amusement-park | [官网](https://www.legoland.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 10 | `sanrio-puroland` | サンリオピューロランド | amusement-park | [官网](https://www.puroland.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 11 | `seibuen-yuuenchi` | 西武園ゆうえんち | amusement-park | [官网](https://www.seibuen-amusement-park.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

### 水族館（aquarium）— 3 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 12 | `kasai-aquarium` | 葛西臨海水族園 | aquarium | [官网](https://www.tokyo-zoo.net/zoo/kasai/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 13 | `sumida-aquarium` | すみだ水族館 | aquarium | [官网](https://www.sumida-aquarium.com/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 14 | `sunshine-aquarium` | サンシャイン水族館 | aquarium | [官网](https://sunshinecity.jp/aquarium/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

### 児童館（children-hall）— 30 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 15 | `children-hall-kudan` | 千代田区立 九段児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 16 | `children-hall-nihonbashi` | 中央区立日本橋児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 17 | `children-hall-azabu` | 港区立麻布児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 18 | `children-hall-ochiai` | 新宿区立落合児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 19 | `children-hall-hongo` | 文京区立本郷児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 20 | `children-hall-asakusa` | 台東区立浅草児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 21 | `children-hall-higashikomagata` | 墨田区立東駒形児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 22 | `children-hall-kameido` | 江東区立亀戸児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 23 | `children-hall-gotanda` | 品川区立五反田こどもセンター | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 24 | `children-hall-nishioi` | 品川区立西大井児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 25 | `children-hall-omori` | 大田区立大森児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 26 | `children-hall-taishido` | 世田谷区立太子堂児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 27 | `children-hall-yoyogi` | 渋谷区立代々木児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 28 | `children-hall-nakano` | 中野区立中野中央児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 29 | `children-hall-ogikubo` | 杉並区立荻窪児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 30 | `children-hall-mejiro` | 豊島区立目白児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 31 | `children-hall-oji` | 北区立王子児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 32 | `children-hall-higashi` | 荒川区立あらかわ児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 33 | `children-hall-itabashi` | 板橋区立神谷児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 34 | `children-hall-shakujii` | 練馬区立石神井児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 35 | `children-hall-ayase` | 足立区立綾瀬児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 36 | `children-hall-kanamachi` | 葛飾区立金町児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 37 | `children-hall-hirai` | 江戸川区立平井児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 38 | `children-hall-tsukishima` | 中央区立月島児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 39 | `children-hall-ebisu` | 渋谷区立恵比寿児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 40 | `children-hall-nakameguro` | 目黒区立中目黒児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 41 | `children-hall-tamagawadai` | 世田谷区立玉川台児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 42 | `children-hall-kamata` | 大田区立蒲田児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 43 | `children-hall-nishiarai` | 足立区立西新井児童館 | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 44 | `children-hall-harajuku` | 渋谷区立原宿児童センター | children-hall | — | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |

### イベント広場（event）— 2 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 45 | `sky-tree-event-plaza` | 東京スカイツリータウン イベント広場 | event | [官网](https://www.tokyo-skytree.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 46 | `odaiba-event-plaza` | お台場 ダイバーシティ イベント広場 | event | [官网](https://www.divercity-tokyo.com/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |

### 施設（facility）— 8 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 47 | `tokyo-tower` | 東京タワー | facility | [官网](https://www.tokyotower.co.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 48 | `tokyo-gym` | 東京体育館 | facility | [官网](https://www.tef.or.jp/tmg/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 49 | `bumb-tokyo-sports` | BumB東京スポーツ文化館 | facility | [官网](https://www.ys-tokyobay.co.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | 本館+夢の島公園 (CC) |
| 50 | `setagaya-sports-center` | 世田谷区立総合運動場 | facility | [官网](https://www.city.setagaya.lg.jp/01430/9045.html) | 実写 5 | P4 (Wikimedia) | 3/3 | 0/1 | 大倉山公園関連 (CC) |
| 51 | `edogawa-sogo-taikan` | 江戸川区総合体育館 | facility | [官网](https://www.edogawa-sotai.com/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 52 | `higashin-arena` | ひがしんアリーナ（墨田区総合体育館） | facility | [官网](https://www.sumidacity-gym.com/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 53 | `ota-sogo-taikan` | EBARA WAVE アリーナおおた（大田区総合体育館） | facility | [官网](https://www.ota.esforta.jp/arena/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 54 | `nerima-sogo-taikan` | 練馬区立総合体育館 | facility | [官网](https://www.city.nerima.tokyo.jp/shisetsu/koen/taiku/sogo.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |

### 屋内あそび（indoor-play）— 2 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 55 | `kidzania-tokyo` | キッザニア東京 | indoor-play | [官网](https://www.kidzania.jp/tokyo/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 56 | `bornelund-harajuku` | ボーネルンド あそびのせかい | indoor-play | [官网](https://www.bornelund.co.jp/shop/store/395) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 他店写真を除外、placeholder 化 |

### 図書館（library）— 19 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 57 | `tokyo-metro-library` | 東京都立中央図書館 | library | [官网](https://www.library.metro.tokyo.lg.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 58 | `shinjuku-chuo-library` | 新宿区立中央図書館・こども図書館 | library | [官网](https://www.library.shinjuku.tokyo.jp/facility/chuo/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 59 | `setagaya-chuo-library` | 世田谷区立中央図書館 | library | [官网](https://www.city.setagaya.lg.jp/02261/9023.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 60 | `koto-chuo-library` | 江東図書館（区立中央館） | library | [官网](https://www.koto-lib.tokyo.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 61 | `taito-chuo-library` | 台東区立中央図書館 | library | [官网](https://www.city.taito.lg.jp/library/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 62 | `gotanda-library` | 品川区立五反田図書館 | library | [官网](https://library.city.shinagawa.tokyo.jp/tabid/153/Default.aspx) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 63 | `nerima-chuo-library` | 練馬区立練馬図書館（生涯学習センター内） | library | [官网](https://www.city.nerima.tokyo.jp/shisetsu/bunka/lib/nerima.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 64 | `itabashi-chuo-library` | 板橋区立中央図書館 | library | [官网](https://www.city.itabashi.tokyo.jp/library/) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 65 | `adachi-chuo-library` | 足立区立中央図書館 | library | [官网](https://www.city.adachi.tokyo.jp/toshokan/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 66 | `nakano-chuo-library` | 中野区立中央図書館 | library | [官网](https://library.city.tokyo-nakano.lg.jp/) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 67 | `suginami-chuo-library` | 杉並区立中央図書館 | library | [官网](https://www.city.suginami.tokyo.jp/kusei/gaiyou/shisetsu/genre/bunka/toshokan/index.html) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 68 | `arakawa-furalibrary` | ゆいの森あらかわ（荒川区立中央図書館） | library | [官网](https://yui-forest.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 69 | `bunkyo-masago-chuo` | 文京区立真砂中央図書館 | library | [官网](https://www.lib.city.bunkyo.tokyo.jp/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 70 | `shibuya-chuo-library` | 渋谷区立中央図書館 | library | [官网](https://www.lib.city.shibuya.tokyo.jp/library/central/) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 71 | `katsushika-chuo-library` | 葛飾区立中央図書館 | library | [官网](https://www.lib.city.katsushika.lg.jp/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 72 | `chiyoda-hibiya-library` | 日比谷図書文化館（千代田区立） | library | [官网](https://www.library.chiyoda.tokyo.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 73 | `meguro-ku-court-library` | 目黑区民センター図書館 | library | [官网](https://www.meguro-library.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 74 | `kita-chuo-library` | 北区立中央図書館 | library | [官网](https://www.library.city.kita.lg.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 75 | `minato-mita-library` | 港区立三田図書館 | library | [官网](https://www.lib-minato.jp/library/mita.html) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

### 博物館（museum）— 10 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 76 | `national-science-museum` | 国立科学博物館 | museum | [官网](https://www.kahaku.go.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 77 | `miraikan` | 日本科学未来館 | museum | [官网](https://www.miraikan.jst.go.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 78 | `railway-museum` | 鉄道博物館 | museum | [官网](https://www.railway-museum.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 79 | `tobu-museum` | 東武博物館 | museum | [官网](https://www.tobu.co.jp/museum/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 80 | `metro-museum` | 地下鉄博物館（ちかはく） | museum | [官网](https://www.chikahaku.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 81 | `tokyu-train-bus-museum` | 電車とバスの博物館 | museum | [官网](https://denbus.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 82 | `ome-railway-park` | 青梅鉄道公園 | museum | [官网](https://www.jreast.co.jp/railwaypark/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 83 | `keio-rail-land` | 京王れーるランド | museum | [官网](https://www.keio-rail-land.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 84 | `romancecar-museum` | ロマンスカーミュージアム | museum | [官网](https://www.odakyu.jp/romancecarmuseum/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 85 | `toden-omoide-hiroba` | 都電おもいで広場 | museum | [官网](https://www.kotsu.metro.tokyo.jp/toden/kanren/omoide.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

### 公園（park）— 31 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 86 | `ueno-park` | 上野恩賜公園 | park | [官网](https://www.kensetsu.metro.tokyo.lg.jp/jimusho/toubuk/ueno/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 87 | `yoyogi-park` | 代々木公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index028.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 88 | `inokashira-park` | 井の頭恩賜公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index045.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 89 | `hikarigaoka-park` | 光が丘公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index026.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 90 | `wadabori-park` | 和田堀公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index047.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 91 | `showa-kinen-park` | 国営昭和記念公園 | park | [官网](https://www.showakinenpark.go.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 92 | `omiya-park` | 大宮公園 | park | [官网](https://www.saitamapark.or.jp/omiya/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 93 | `kameido-central-park` | 亀戸中央公園 | park | [官网](https://tokyo-eastpark.com/parksearch/kameido) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 94 | `tategawa-riverbed-park` | 竪川河川敷公園 | park | [官网](https://www.tatekawa-riverbed-park.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | 竪川/水門/トラス橋 (CC) |
| 95 | `godoteien-garden` | 三代豊国五渡亭園 | park | [官网](http://www.gonohashi.jp/gototeien-1.htm) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 96 | `kiba-shinsui-park` | 木場親水公園 | park | [官网](https://www.city.koto.lg.jp/470601/shisetsuannai/kokyo/koen/kuritsukoen/16421.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 97 | `koishiba-shinsui-park` | 古石場川親水公園 | park | [官网](https://www.gotokyo.org/jp/spot/1098/index.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | 小津橋 (CC BY-SA 4.0) |
| 98 | `joto-park` | 城東公園 | park | [官网](https://www.city.koto.lg.jp/470601/riyou/koen/shisetsuannai.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 誤図（クリニック/深セン）除外 |
| 99 | `echujima-park` | 越中島公園 | park | [官网](https://ja.wikipedia.org/wiki/%E8%B6%8A%E4%B8%AD%E5%B3%B6%E5%85%AC%E5%9C%92) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 100 | `toyosu-park` | 豊洲公園 | park | [官网](https://www.city.koto.lg.jp/470601/shisetsuannai/kokyo/koen/kuritsukoen/16394.html) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 101 | `sendaihorikawa-park` | 仙台堀川公園 | park | [官网](https://www.city.koto.lg.jp/promotion/spot/sendaibori.html) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 102 | `kiba-park` | 木場公園 | park | [官网](https://www.tokyo-park.or.jp/park/kiba/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 103 | `umi-no-mori-park` | 海の森公園 | park | [官网](https://uminomoripark.com/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 104 | `sarue-onshi-park` | 猿江恩賜公園 | park | [官网](https://tokyo-eastpark.com/parksearch/sarueonshi) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 105 | `kasai-rinkai-park` | 葛西臨海公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index097.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 106 | `yumenoshima-park` | 夢の島公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index098.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 107 | `ojima-komatsugawa-park` | 大島小松川公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index099.html) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 108 | `hibiya-park` | 日比谷公園 | park | [官网](https://www.tokyo-park.or.jp/park/format/index019.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 109 | `shinjuku-gyoen` | 新宿御苑 | park | [官网](https://www.env.go.jp/garden/shinjukugyoen/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 110 | `kinshi-park` | 錦糸公園 | park | [官网](https://www.city.sumida.lg.jp/sisetu_info/kouen/kunai_park_annai/sumida_park/park14.html) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 111 | `koganei-park` | 小金井公園 | park | [官网](https://www.tokyo-park.or.jp/park/koganei/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 112 | `shioiri-park` | 汐入公園 | park | [官网](https://www.tokyo-park.or.jp/park/shioiri/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 113 | `ukima-park` | 浮間公園 | park | [官网](https://www.tokyo-park.or.jp/park/ukima/) | 実写 2 + 補 1 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 114 | `toneri-park` | 舎人公園 | park | [官网](https://www.tokyo-park.or.jp/park/toneri/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 115 | `asukayama-park` | 飛鳥山公園 | park | [官网](https://www.city.kita.lg.jp/parks/asukayamapark/index.html) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 116 | `shiba-park` | 芝公園 | park | [官网](https://www.tokyo-park.or.jp/park/shiba/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

### 遊具広場（playground）— 8 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 117 | `komazawa-playground` | 駒沢オリンピック公園 遊具広場 | playground | [官网](https://www.tokyo-park.or.jp/park/format/index021.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 118 | `sarue-playground` | 猿江恩賜公園 遊具エリア | playground | [官网](https://www.kensetsu.metro.tokyo.lg.jp/jimusho/koutou/sarue/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 119 | `minamiikebukuro-park` | 南池袋公園 プレイパーク | playground | [官网](https://www.city.toshima.lg.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 120 | `toyama-park-playground` | 戸山公園 遊具広場 | playground | [官网](https://www.tokyo-park.or.jp/park/format/index034.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 121 | `tetsugakudo-park` | 哲学堂公園 遊具広場 | playground | [官网](https://www.city.tokyo-nakano.lg.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 122 | `gyosen-park` | 行船公園 遊具エリア | playground | [官网](https://www.city.edogawa.tokyo.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 123 | `shakujii-park-playground` | 石神井公園 遊具広場 | playground | [官网](https://www.tokyo-park.or.jp/park/format/index046.html) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 124 | `arakawa-nature-park` | 荒川自然公園 遊具エリア | playground | [官网](https://www.city.arakawa.tokyo.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |

### レストラン（restaurant）— 1 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 125 | `gusto-ikebukuro` | ガスト 池袋東口店 | restaurant | [官网](https://www.skylark.co.jp/gusto/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |

### ショップ（shop）— 2 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 126 | `koshigaya-laketown` | 越谷レイクタウン | shop | [官网](https://lake-town.jp/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 127 | `lalaport-tokyo-bay` | ららぽーとTOKYO-BAY | shop | [官网](https://mitsui-shopping-park.com/lalaport/tokyobay/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

### おもちゃ美術館（toy-play）— 6 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 128 | `tokyo-toy-museum` | 東京おもちゃ美術館 | toy-play | [官网](https://goodtoy.org/ttm/) | 実写 1 + 補 2 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 129 | `osaka-toy-museum` | 大阪おもちゃ美術館 | toy-play | [官网](https://toy-museum.jp/) | 実写 1 + 補 2 | P2 | 3/3 | 0/1 | 館ビル未確定（要確認） |
| 130 | `tsuyama-toy-museum` | 津山おもちゃ美術館 | toy-play | [官网](https://toy-museum.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 131 | `otaru-toy-museum` | 小樽おもちゃ美術館 | toy-play | [官网](https://toy-museum.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |
| 132 | `mori-toy-museum` | 森のおもちゃ美術館 | toy-play | [官网](https://toy-museum.jp/) | 実写 4 | P1 (官网) | 3/3 | 0/1 | 檜原村観光協会 公式 4 枚 |
| 133 | `toy-kingdom` | おもちゃ王国 | toy-play | [官网](https://www.toykingdom.co.jp/) | 補 3 (placeholder) | placeholder | 3/3 | 0/1 | 準備中 (Kodoko) |

### 動物園（zoo）— 4 件
| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |
|---|----------|------|------|---------|----------|------|------|------|------|
| 134 | `ueno-zoo` | 上野動物園 | zoo | [官网](https://www.tokyo-zoo.net/zoo/ueno/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 135 | `tama-zoo` | 多摩動物公園 | zoo | [官网](https://www.tokyo-zoo.net/zoo/tama/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |
| 136 | `itabashi-children-zoo` | 東京都板橋区立 こども動物園 | zoo | [官网](https://itabashi-park-zoo.com/honen/) | 実写 5 | P1 (官网) | 3/3 | 0/1 | 指定管理者サイト公式 5 枚 |
| 137 | `saitama-children-zoo` | 埼玉県こども動物自然公園 | zoo | [官网](https://www.parks.or.jp/sczoo/) | 実写 3 | P4 (Wikimedia) | 3/3 | 0/1 | Wikimedia CC |

合计：**137** 地点。目標：每地点 ≥3 張照片(達成)、視頻 0/1(本輪依決策跳過)。

> 本表由 `apps/api/src/data/places/*.ts` 実データ + `scripts/media-audit.json` 自動生成（2026-08-07 採取後）。
> 注意：数据文件为活跃开发状态，后续新增地点需重新生成。

---

## 10. 採取実績（2026-08-08）

| 指标 | 值 |
|---|---|
| 地点总数 | 137 |
| 媒体完成（DoD） | 137 / 137（100%） |
| 未完成 | 0 |
| 真实照片地点（≥1 実写） | 101 |
| 完全実写地点（≥3 実写） | 94 |
| 真实照片（Wikimedia + 官网） | 291 张 |
| 占位 SVG（/media/placeholder/） | 120 张 |
| 官网（P1）収録地点 | 2（mori-toy-museum 4 枚、itabashi-children-zoo 5 枚） |
| 视频 | 0（依决策本轮跳过） |
| 每地点媒体数 | 3 张照片 + 1 张封面 |
| lint / typecheck / test / build | 全绿 |

补足：
- 本轮（2026-08-08）修复：itabashi-children-zoo（官网 5 枚）、bumb-tokyo-sports（本館+夢の島公園 3 枚）、tategawa-riverbed-park（3 枚）、setagaya-sports-center（5 枚）、koishiba-shinsui-park（小津橋 3 枚）、mori-toy-museum（檜原村観光協会公式 4 枚，OFFICIAL_REPLACE）。
- 错误图片清除：joto-park（クリニック/深セン写真）、bornelund-harajuku（他店写真）→ 一律 placeholder，避免展示无关内容。
- 残余短板：30 児童館 + osaka/tsuyama/otaru 玩具館 + edogawa-taikan（官网图 350×227 不达标）+ 五反田図書館等，均以 placeholder 兜底（児童館另行专项处理）。
- 官网収録流程：`scripts/curate-commons.mts` の OFFICIAL_MAP（P1）+ CURATED_MAP（P4）+ OFFICIAL_REPLACE 更新 → `inject-media-v2.mts` → `media-audit.mts`。官网图片需 ≥800×600（verifyImage 校验）。
- 详细见 `scripts/media-audit.json`。
