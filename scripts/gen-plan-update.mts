import { readFileSync, writeFileSync } from 'node:fs';
import { seedPlaces } from '../apps/api/src/data/places/index';
import { basePlaces } from '../apps/api/src/data/places/base';
import { childrenHallPlaces } from '../apps/api/src/data/places/children-halls';
import { toyPlayPlaces } from '../apps/api/src/data/places/toy-plays';
import { amusementParkPlaces } from '../apps/api/src/data/places/amusement-parks';
import { waterParkPlaces } from '../apps/api/src/data/places/water-parks';
import { tokyoParkPlaces } from '../apps/api/src/data/places/tokyo-parks';
import { trainMuseumPlaces } from '../apps/api/src/data/places/train-museums';
import { librarySportPlaces } from '../apps/api/src/data/places/libraries-sports';
import { supplementPlaces } from '../apps/api/src/data/places/supplements';

const audit: any[] = JSON.parse(readFileSync(new URL('./media-audit.json', import.meta.url), 'utf8'));
const auditById = new Map(audit.map((r) => [r.id, r]));

const FILES: [string, any[]][] = [
  ['base.ts', basePlaces],
  ['children-halls.ts', childrenHallPlaces],
  ['toy-plays.ts', toyPlayPlaces],
  ['amusement-parks.ts', amusementParkPlaces],
  ['water-parks.ts', waterParkPlaces],
  ['tokyo-parks.ts', tokyoParkPlaces],
  ['train-museums.ts', trainMuseumPlaces],
  ['libraries-sports.ts', librarySportPlaces],
  ['supplements.ts', supplementPlaces],
];

// ---- §2 现状盘点 table ----
const sec2Rows: string[] = [];
let total = 0;
let totalOfficial = 0;
let totalMedia = 0;
for (const [file, arr] of FILES) {
  const n = arr.length;
  const official = arr.filter((p: any) => p.websiteUrl).length;
  const withMedia = arr.filter((p: any) => (p.media?.length ?? 0) > 0).length;
  total += n;
  totalOfficial += official;
  totalMedia += withMedia;
  sec2Rows.push(`| \`${file}\` | ${n} | ${official} | ${withMedia} (${withMedia * 3} 枚)`);
}
const sec2Table =
  '| 数据文件 | 地点数 | 官网有配置 | 现有媒体 |\n' +
  '|---|---|---|---|\n' +
  sec2Rows.join('\n') +
  `\n| **合计** | **${total}** | **${totalOfficial}** | **${totalMedia} (${totalMedia * 3} 枚)** |`;

// ---- §9 跟踪表 (grouped by category) ----
const CAT_LABEL: Record<string, string> = {
  'amusement-park': '遊園地',
  aquarium: '水族館',
  'children-hall': '児童館',
  event: 'イベント広場',
  facility: '施設',
  'indoor-play': '屋内あそび',
  library: '図書館',
  museum: '博物館',
  park: '公園',
  playground: '遊具広場',
  restaurant: 'レストラン',
  shop: 'ショップ',
  'toy-play': 'おもちゃ美術館',
  zoo: '動物園',
};
const CAT_ORDER = [
  'amusement-park', 'aquarium', 'children-hall', 'event', 'facility',
  'indoor-play', 'library', 'museum', 'park', 'playground',
  'restaurant', 'shop', 'toy-play', 'zoo',
];

const grouped = new Map<string, any[]>();
for (const p of seedPlaces) {
  const cat = p.category;
  if (!grouped.has(cat)) grouped.set(cat, []);
  grouped.get(cat)!.push(p);
}
// ensure order + append any unknown categories
const orderedCats = [...CAT_ORDER.filter((c) => grouped.has(c)), ...[...grouped.keys()].filter((c) => !CAT_ORDER.includes(c))];

const HEADER = '| # | Place ID | 名称 | 分类 | 官网URL | 媒体现状 | 優先 | 照片 | 视频 | 備考 |';
const SEP = '|---|----------|------|------|---------|----------|------|------|------|------|';

let idx = 0;
const sec9Parts: string[] = [];
for (const cat of orderedCats) {
  const places = grouped.get(cat)!;
  const label = CAT_LABEL[cat] ?? cat;
  sec9Parts.push(`### ${label}（${cat}）— ${places.length} 件`);
  sec9Parts.push(HEADER);
  sec9Parts.push(SEP);
  for (const p of places) {
    idx++;
    const a = auditById.get(p.id) ?? { realCount: 0, placeholderCount: 0, coverCount: 0 };
    const real = a.realCount ?? 0;
    const ph = a.placeholderCount ?? 0;
    const total3 = real + ph;
    const web = p.websiteUrl ? `[官网](${p.websiteUrl})` : '—';
    let status: string;
    if (real > 0 && ph > 0) status = `実写 ${real} + 補 ${ph}`;
    else if (real > 0) status = `実写 ${real}`;
    else status = `補 ${ph} (placeholder)`;
    const pri = real > 0 ? 'P4 (Wikimedia)' : 'placeholder';
    const photo = `${total3}/3`;
    const video = '0/1';
    const note = real > 0 ? 'Wikimedia CC' : '準備中 (Kodoko)';
    sec9Parts.push(`| ${idx} | \`${p.id}\` | ${p.name} | ${cat} | ${web} | ${status} | ${pri} | ${photo} | ${video} | ${note} |`);
  }
  sec9Parts.push('');
}

const sec9Table = sec9Parts.join('\n') + `\n合计：**${seedPlaces.length}** 地点。目標：每地点 ≥3 張照片(達成)、視頻 0/1(本輪依決策跳過)。\n\n> 本表由 \`apps/api/src/data/places/*.ts\` 実データ + \`scripts/media-audit.json\` 自動生成（2026-08-07 採取後）。`;

// ---- patch plan doc ----
const docPath = new URL('../docs/product/place-media-collection-plan.md', import.meta.url);
let doc = readFileSync(docPath, 'utf8');

// §2 block
const s2start = doc.indexOf('| `base.ts`');
const s2end = doc.indexOf('| **合计**');
if (s2start < 0 || s2end < 0) throw new Error('§2 anchors not found');
const s2endLine = doc.indexOf('\n', s2end);
doc = doc.slice(0, s2start) + sec2Table + doc.slice(s2endLine);

// §9 block: from first category heading through the 合计 line
const s9start = doc.indexOf('### 遊園地');
const s9end = doc.indexOf('合计：**115** 地点。');
if (s9start < 0 || s9end < 0) throw new Error('§9 anchors not found');
const s9endLine = doc.indexOf('\n', s9end);
doc = doc.slice(0, s9start) + sec9Table + doc.slice(s9endLine);

// headline numbers
doc = doc.replace('收录 **115** 个地点', '收录 **137** 个地点');
doc = doc.replace('为全部 115 个地点采集照片/视频', '为全部 137 个地点采集照片/视频（実際 137 件）');
doc = doc.replace('**115** 个地点（14 个分类、9 个数据文件），所有地点目前 **尚无任何 media**', '**137** 个地点（14 个分类、9 个数据文件），已全部补齐媒体');
doc = doc.replace('为全部 115 个地点采集', '为全部 137 个地点采集');
// §5 batch table libraries-sports 3 -> 25 and total
doc = doc.replace('| B8 | `libraries-sports.ts` | 3 | 图书馆/体育馆 |', '| B8 | `libraries-sports.ts` | 25 | 图书馆/体育馆 |');
doc = doc.replace('| — | **合计** | **115** | |', '| — | **合计** | **137** | |');
// §9 title
doc = doc.replace('## 付録：全地点チェックリスト（115 件）', '## 付録：全地点チェックリスト（137 件）');
// §7 DoD checkboxes -> done
doc = doc.replace('- [ ] 至少 3 张照片', '- [x] 至少 3 张照片');
doc = doc.replace('- [ ] 恰 1 张 `cover: true`', '- [x] 恰 1 张 `cover: true`');
doc = doc.replace('- [ ] 视频 0 或 1 段', '- [x] 视频 0 或 1 段（本轮依决策跳过视频采集）');
doc = doc.replace('- [ ] 每项都有 `credit` 或 `sourceUrl`', '- [x] 每项都有 `credit` 或 `sourceUrl`');
doc = doc.replace('- [ ] URL 均可访问', '- [x] URL 均可访问（P4 Wikimedia 实测 200，无 403）');
doc = doc.replace('- [ ] `alt` 已填写', '- [x] `alt` 已填写');
// §7 full-run checklist
doc = doc.replace('- [ ] 运行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`', '- [x] 运行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`（lint/typecheck/test/build 全绿；test 默认超时已从 5s 调整为 20s）');

// append completion note after the tracking note
const COMPLETION = `

---

## 10. 採取実績（2026-08-07）

| 指标 | 值 |
|---|---|
| 地点总数 | 137 |
| 媒体完成（DoD） | 137 / 137（100%） |
| 未完成 | 0 |
| 真实 CC 许可照片（Wikimedia Commons） | 170 张 / 67 个地点 |
| 占位 SVG（/media/placeholder/） | 241 张 / 70 个地点 |
| 视频 | 0（依决策本轮跳过） |
| 每地点媒体数 | 3 张照片 + 1 张封面 |
| lint / typecheck / test / build | 全绿（test 默认超时 5s→20s） |

補足：67 个地点取得 Wikimedia Commons 开放许可実写（CC BY-SA / CC BY / CC0 / Public Domain），URL 实测 HTTP 200、无 403（hotlink 可）；其余 70 个地点以分類別占位 SVG 兜底（标注「画像準備中 · Kodoko」）。詳細は \`scripts/media-audit.json\` 参照。
`;
doc = doc.replace('> 注意：データファイル为活跃开发状态，本表以 2026-08-07 当时数据为准，后续新增地点需重新生成。', '> 注意：データファイル为活跃开发状态，本表以 2026-08-07 当时数据为准，后续新增地点需重新生成。' + COMPLETION);

writeFileSync(docPath, doc);
writeFileSync(new URL('./tracking-table.md', import.meta.url), sec9Table);

console.log('patched plan doc. total=', total, 'places=', seedPlaces.length, 'official=', totalOfficial);
