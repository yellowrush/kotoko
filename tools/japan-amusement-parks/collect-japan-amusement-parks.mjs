import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
const CHECKED_AT = "2026-08-12T00:00:00.000Z";
const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-amusement-parks.ts";
const EXISTING_INPUTS = [
  "apps/api/src/data/places/base.ts",
  "apps/api/src/data/places/amusement-parks.ts",
  "apps/api/src/data/places/train-museums.ts",
  "apps/api/src/data/places/toy-plays.ts",
  "apps/api/src/data/places/zoo-supplements.ts",
];

const PREFECTURE_CODES = [
  "JP-01",
  "JP-02",
  "JP-03",
  "JP-04",
  "JP-05",
  "JP-06",
  "JP-07",
  "JP-08",
  "JP-09",
  "JP-10",
  "JP-11",
  "JP-12",
  "JP-13",
  "JP-14",
  "JP-15",
  "JP-16",
  "JP-17",
  "JP-18",
  "JP-19",
  "JP-20",
  "JP-21",
  "JP-22",
  "JP-23",
  "JP-24",
  "JP-25",
  "JP-26",
  "JP-27",
  "JP-28",
  "JP-29",
  "JP-30",
  "JP-31",
  "JP-32",
  "JP-33",
  "JP-34",
  "JP-35",
  "JP-36",
  "JP-37",
  "JP-38",
  "JP-39",
  "JP-40",
  "JP-41",
  "JP-42",
  "JP-43",
  "JP-44",
  "JP-45",
  "JP-46",
  "JP-47",
];

const EXACT_EXCLUDE_NAMES = new Set([
  "Theme Park",
  "Amusement Park",
  "遊園地",
  "遊園",
  "ゆうえんち",
  "アトラクション",
  "NHKスタジオパーク",
  "ダイヤと花の大観覧車",
  "台場一丁目商店街",
  "吉祥寺プティット村",
  "わんダフルネイチャーヴィレッジ",
  "Dynam amusement park",
  "石の遊園地",
]);

const EXACT_INCLUDE_NAMES = new Set([
  "アドベンチャーワールド",
  "アンパンマンこどもミュージアム",
  "えひめこどもの城",
  "おきなわワールド",
  "おやつタウン",
  "おさるランド&アニタウン",
  "カンドゥー",
  "ジブリパーク",
  "ジャングリア沖縄",
  "スマイルグリコパーク",
  "チビッ子忍者村",
  "ちびまる子ちゃんランド",
  "つくばわんわんランド",
  "ディノアドベンチャー名古屋",
  "ともいきの国 伊勢忍者キングダム",
  "ナンジャタウン",
  "ハーモニーランド",
  "ひらかたパーク",
  "ポルトヨーロッパ",
  "マザー牧場",
  "ムーミンバレーパーク",
  "モビリティリゾートもてぎ",
  "ラグーナテンボス",
  "リトルワールド",
  "レゴランド・ディスカバリー・センター",
  "ワーナー ブラザース スタジオツアー東京 - メイキング・オブ・ハリー・ポッター",
  "浅草花やしき",
  "東京ジョイポリス",
  "東京ドイツ村",
  "東映太秦映画村",
  "日光江戸村",
  "明治村",
  "鈴鹿サーキット",
  "鈴鹿サーキットパーク",
]);

const INCLUDE_PATTERNS = [
  "遊園地",
  "ゆうえんち",
  "テーマパーク",
  "アトラクションズ",
  "プレジャーガーデン",
  "ハイランドパーク",
  "サマーランド",
  "ジョイポリス",
  "ピューロランド",
  "ハウステンボス",
  "レゴランド",
  "ラグナシア",
  "スペイン村",
  "パルケエスパーニャ",
  "ナガシマスパーランド",
  "グリーンランド",
  "モンキーパーク",
  "おもちゃ王国",
  "ファミリーランド",
  "レジャーランド",
  "ワンダーランド",
  "Theme Park",
  "Amusement Park",
];

const EXCLUDE_PATTERNS = [
  "児童遊園",
  "こども遊園",
  "子供遊園",
  "町内会",
  "団地",
  "自治会",
  "遊具",
  "プレイロット",
  "観覧車",
  "有料エリア",
  "海水プール",
  "滑り台",
  "ゴーカート",
  "アーチェリー",
  "商店街",
  "横丁",
  "書店",
  "自然公園",
  "サバイバルゲーム",
  "ゾーン",
  "ロッジ",
  "Dynam",
  "ショップ",
  "売店",
  "レストラン",
  "カフェ",
  "ホテル",
  "駐車場",
  "入口",
  "ゲート",
  "トイレ",
  "駅",
  "バス停",
  "事務所",
  "会社",
  "工場",
  "倉庫",
  "ゴルフ",
  "テニス",
  "パチンコ",
  "ゲームセンター",
  "shop",
  "store",
  "restaurant",
  "cafe",
  "hotel",
  "parking",
  "gate",
  "station",
  "office",
  "factory",
  "warehouse",
];

function parseArgs(argv) {
  const args = { mergeExisting: false, output: DEFAULT_OUTPUT };
  for (const arg of argv) {
    if (arg.startsWith("--output="))
      args.output = arg.slice("--output=".length);
    if (arg.startsWith("--from-json="))
      args.fromJson = arg.slice("--from-json=".length);
    if (arg === "--merge-existing") args.mergeExisting = true;
    if (arg.startsWith("--prefectures="))
      args.prefectures = arg
        .slice("--prefectures=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
  }
  return args;
}

function includesAny(value, patterns) {
  const lower = value.toLocaleLowerCase("ja");
  return patterns.some((pattern) =>
    lower.includes(pattern.toLocaleLowerCase("ja")),
  );
}

function normalizeName(value) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function canonicalName(value) {
  return normalizeName(value)
    .replace(
      /^東京ドームシティアトラクションズ$/,
      "東京ドームシティ アトラクションズ",
    )
    .replace(/^横浜・八景島シーパラダイス$/, "八景島シーパラダイス")
    .replace(/^横浜八景島シーパラダイス$/, "八景島シーパラダイス")
    .replace(/^LEGOLAND Japan$/i, "レゴランド・ジャパン")
    .replace(/^Universal Studios Japan$/i, "ユニバーサル・スタジオ・ジャパン")
    .replace(/^Tokyo Disney Land$/i, "東京ディズニーランド")
    .replace(/^Tokyo Disney Sea$/i, "東京ディズニーシー")
    .replace(/^Huis Ten Bosch$/i, "ハウステンボス")
    .replace(/^Hirakata Park$/i, "ひらかたパーク")
    .replace(/^Kijima Kogen Park$/i, "城島高原パーク")
    .replace(/^Rusutsu Resort amusement park$/i, "ルスツリゾート遊園地")
    .replace(/^Sanrio Puroland$/i, "サンリオピューロランド")
    .replace(/^ジョイポリス$/, "東京ジョイポリス")
    .trim();
}

function placeNameKey(value) {
  return canonicalName(value).normalize("NFKC").replace(/\s+/g, "");
}

function getName(tags) {
  return normalizeName(tags["name:ja"] ?? tags.name ?? tags["name:en"] ?? "");
}

function getCoordinate(element) {
  return {
    latitude: element.lat ?? element.center?.lat,
    longitude: element.lon ?? element.center?.lon,
  };
}

function slugify(input) {
  let hash = 0x811c9dc5;
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `osm-amusement-park-${hash.toString(16).padStart(8, "0")}`;
}

function sourceUrlFor(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

async function getExistingPlaceNames(inputPaths = EXISTING_INPUTS) {
  const names = new Set();
  for (const inputPath of inputPaths) {
    try {
      const source = await readFile(inputPath, "utf8");
      for (const match of source.matchAll(/\bname:\s*["']([^"']+)["']/g)) {
        names.add(placeNameKey(match[1]));
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return names;
}

function isLikelyStandaloneAmusementPark(element, existingNames) {
  const tags = element.tags ?? {};
  const rawName = getName(tags);
  const name = canonicalName(rawName);
  if (!name) return false;
  if (EXACT_EXCLUDE_NAMES.has(name)) return false;
  if (existingNames.has(placeNameKey(name))) return false;
  if (includesAny(name, EXCLUDE_PATTERNS)) return false;
  if (tags.access === "private" || tags.access === "no") return false;
  if (tags.shop || tags.office || tags.craft) return false;

  const taggedThemePark = tags.tourism === "theme_park";
  const namedAmusementPark =
    EXACT_INCLUDE_NAMES.has(name) || includesAny(name, INCLUDE_PATTERNS);
  if (!taggedThemePark || !namedAmusementPark) return false;

  const hasPublicEvidence =
    Boolean(tags.website) ||
    Boolean(tags["contact:website"]) ||
    Boolean(tags.wikidata) ||
    Boolean(tags["addr:province"]) ||
    Boolean(tags["addr:city"]) ||
    Boolean(tags["KSJ2:AAC"]) ||
    taggedThemePark;

  return hasPublicEvidence;
}

function toPlaceInput(element) {
  const tags = element.tags ?? {};
  const name = canonicalName(getName(tags));
  const { latitude, longitude } = getCoordinate(element);
  const websiteUrl = tags.website ?? tags["contact:website"];
  const osmUrl = sourceUrlFor(element);
  const addressParts = [
    tags["addr:province"],
    tags["addr:county"],
    tags["addr:city"],
    tags["addr:suburb"],
    tags["addr:neighbourhood"],
    tags["addr:street"],
    tags["addr:block_number"],
    tags["addr:housenumber"],
  ].filter(Boolean);

  return {
    id: slugify(`${element.type}/${element.id}`),
    name,
    category: "amusement-park",
    latitude,
    longitude,
    address: addressParts.length > 0 ? addressParts.join("") : "日本",
    municipalityCode: tags["KSJ2:AAC"] ?? `OSM-${element.type}-${element.id}`,
    shortDescription: `${name}として公開地図データに登録されている遊園地・テーマパークです。来園前に公式情報を確認してください。`,
    suitableAgeMinMonths: 12,
    suitableAgeMaxMonths: 216,
    indoorOutdoor: "mixed",
    priceLevel: 3,
    strollerFriendly: true,
    nursingRoom: undefined,
    diaperChanging: undefined,
    tags: ["group-play", "stroller-friendly", "dining"],
    websiteUrl,
    sourceUrl: websiteUrl ?? osmUrl,
    sourceCheckedAt: CHECKED_AT,
    status: "published",
    provenance: [
      {
        type: "open-data",
        name: "OpenStreetMap Overpass API theme park candidates",
        url: osmUrl,
        fetchedAt: CHECKED_AT,
      },
    ],
  };
}

function evidenceScore(element) {
  const tags = element.tags ?? {};
  const name = getName(tags);
  let score = 0;
  if (tags["name:ja"] || /[\u3040-\u30ff\u3400-\u9fff]/.test(name)) score += 8;
  if (tags.tourism === "theme_park") score += 6;
  if (tags.wikidata) score += 4;
  if (tags.website || tags["contact:website"]) score += 3;
  if (tags["addr:province"] || tags["addr:city"] || tags["KSJ2:AAC"])
    score += 2;
  if (element.type === "way" || element.type === "relation") score += 1;
  return score;
}

function formatValue(value, indent = 4) {
  const pad = " ".repeat(indent);
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value
      .map((item) => `${pad}  ${formatValue(item, indent + 2)}`)
      .join(",\n");
    return `[\n${items},\n${pad}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .map(([key, item]) => {
        const formatted = formatValue(item, indent + 2);
        if (formatted === undefined) return undefined;
        return `${pad}  ${key}: ${formatted}`;
      })
      .filter(Boolean)
      .join(",\n");
    return `{\n${entries},\n${pad}}`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function renderPlaces(places) {
  return renderPlaceBlocks(places.map((place) => `  ${formatValue(place, 2)}`));
}

function renderPlaceBlocks(blocks) {
  const entries = blocks.length > 0 ? `${blocks.join(",\n")},` : "";
  return `import type { PlaceInput } from "@kodoko/domain";

/**
 * Generated from OpenStreetMap Overpass API theme park candidates.
 * Regenerate with:
 *   node tools/japan-amusement-parks/collect-japan-amusement-parks.mjs --output=apps/api/src/data/places/generated-amusement-parks.ts
 */
export const generatedAmusementParkPlaces: PlaceInput[] = [
${entries}
];
`;
}

function extractGeneratedPlaceBlocks(source) {
  const arrayStartMarker =
    "export const generatedAmusementParkPlaces: PlaceInput[] = [";
  const startIndex = source.indexOf(arrayStartMarker);
  const endIndex = source.lastIndexOf("\n];");
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return [];
  }

  const content = source.slice(startIndex + arrayStartMarker.length, endIndex);
  const blocks = [];
  let blockStart = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) blockStart = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && blockStart !== -1) {
        blocks.push(`  ${content.slice(blockStart, index + 1).trim()}`);
        blockStart = -1;
      }
    }
  }
  return blocks;
}

function extractGeneratedPlaceId(block) {
  return block.match(/\bid:\s*"([^"]+)"/)?.[1];
}

async function renderMergedPlaces(output, places) {
  let existingBlocks = [];
  try {
    existingBlocks = extractGeneratedPlaceBlocks(
      await readFile(output, "utf8"),
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const blocksById = new Map();
  for (const block of existingBlocks) {
    const id = extractGeneratedPlaceId(block);
    if (id) blocksById.set(id, block);
  }
  for (const place of places) {
    blocksById.set(place.id, `  ${formatValue(place, 2)}`);
  }
  return renderPlaceBlocks(
    [...blocksById.values()].sort((a, b) => a.localeCompare(b, "ja")),
  );
}

async function fetchElements(query) {
  const body = new URLSearchParams({ data: query });
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "User-Agent":
        "Kodoko data collection bot/0.1 (https://github.com/yellowrush/kotoko)",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(
      `Overpass request failed: ${response.status} ${await response.text()}`,
    );
  }
  const payload = await response.json();
  return payload.elements ?? [];
}

async function collectPrefecture(prefectureCode) {
  const query = `[out:json][timeout:90];
area["ISO3166-2"="${prefectureCode}"][admin_level=4]->.prefecture;
(
  nwr["tourism"="theme_park"](area.prefecture);
);
out center tags;`;

  return fetchElements(query);
}

async function collectFromElements(elements) {
  const byKey = new Map();
  const existingNames = await getExistingPlaceNames();
  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = getName(tags);
    const { latitude, longitude } = getCoordinate(element);
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude))
      continue;
    if (!isLikelyStandaloneAmusementPark(element, existingNames)) continue;
    const dedupeKey = placeNameKey(name);
    const previous = byKey.get(dedupeKey);
    if (!previous || evidenceScore(element) > evidenceScore(previous)) {
      byKey.set(dedupeKey, element);
    }
  }

  const places = [...byKey.values()].map(toPlaceInput);
  places.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return places;
}

async function collectFromJson(inputPath) {
  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  return collectFromElements(payload.elements ?? []);
}

async function collect(prefectureCodes = PREFECTURE_CODES) {
  const byKey = new Map();
  const existingNames = await getExistingPlaceNames();
  const failedPrefectureCodes = [];
  for (const prefectureCode of prefectureCodes) {
    let elements = [];
    try {
      elements = await collectPrefecture(prefectureCode);
    } catch (error) {
      failedPrefectureCodes.push(prefectureCode);
      console.warn(
        `Skipped ${prefectureCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      continue;
    }
    console.log(
      `Fetched ${elements.length} amusement-park candidates from ${prefectureCode}`,
    );
    for (const element of elements) {
      const tags = element.tags ?? {};
      const name = getName(tags);
      const { latitude, longitude } = getCoordinate(element);
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude))
        continue;
      if (!isLikelyStandaloneAmusementPark(element, existingNames)) continue;
      const dedupeKey = placeNameKey(name);
      const previous = byKey.get(dedupeKey);
      if (!previous || evidenceScore(element) > evidenceScore(previous)) {
        byKey.set(dedupeKey, element);
      }
    }
  }

  const places = [...byKey.values()].map(toPlaceInput);
  places.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  if (failedPrefectureCodes.length > 0) {
    console.warn(
      `Skipped ${failedPrefectureCodes.length} prefectures: ${failedPrefectureCodes.join(
        ", ",
      )}`,
    );
  }
  return places;
}

const args = parseArgs(process.argv.slice(2));
const places = args.fromJson
  ? await collectFromJson(args.fromJson)
  : await collect(args.prefectures);
await mkdir(dirname(args.output), { recursive: true });
await writeFile(
  args.output,
  args.mergeExisting
    ? await renderMergedPlaces(args.output, places)
    : renderPlaces(places),
  "utf8",
);
console.log(
  `Wrote ${places.length} generated amusement-park places to ${args.output}`,
);
