import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  enrichOsmElementsWithWikidata,
  mediaFromOsmTags,
  officialWebsiteUrlFromTags,
} from "../lib/osm-place-enrichment.mjs";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
const CHECKED_AT = "2026-08-11T00:00:00.000Z";
const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-zoos.ts";

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

const EXISTING_PLACE_NAMES = new Set([
  "上野動物園",
  "恩賜上野動物園",
  "恩賜上野動物園（東園）",
  "恩賜上野動物園（西園）",
  "多摩動物公園",
  "東京都板橋区立 こども動物園",
  "埼玉県こども動物自然公園",
]);

const EXACT_EXCLUDE_NAMES = new Set([
  "Animal Park",
  "こども動物園",
  "子供動物園",
  "だっこしてZOO",
  "でんきや動物園",
  "なかよし動物園",
  "ふれあい動物園",
  "ふれあい牧場",
  "ミニ動物園",
  "猿の檻",
]);

const INCLUDE_PATTERNS = [
  "動物園",
  "動物公園",
  "どうぶつ園",
  "どうぶつ王国",
  "サファリ",
  "アニマル",
  "モンキー",
  "クマ牧場",
  "熊牧場",
  "くま牧場",
  "Zoological",
  "Zoo",
  "Safari",
  "Animal",
  "Monkey",
  "Bear",
];

const EXCLUDE_PATTERNS = [
  "植物園",
  "薬草園",
  "緑化植物園",
  "水族館",
  "aquarium",
  "botanical",
  "arboretum",
  "herb",
  "獣舎",
  "放飼場",
  "ふれあい広場",
  "動物広場",
  "ポニー乗馬",
  "乗馬",
  "厩舎",
  "ゲート",
  "入口",
  "トイレ",
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
    .replace(/^横浜市立/, "")
    .replace(/^市立/, "")
    .replace(/^Himeji Zoo$/i, "姫路市立動物園")
    .replace(/^Tokushimia Zoo$/i, "とくしま動物園")
    .replace(/・(本園|南園|北園|東園|西園)$/, "")
    .replace(
      /[（(](本園|南園|北園|東園|西園|East Garden|West Garden)[）)]$/,
      "",
    )
    .replace(/\s+猿ヶ島$/, "")
    .replace(/^秋吉台自然動物公園サファリランド$/, "秋吉台サファリランド")
    .replace(/^金沢動物園$/, "横浜市立金沢動物園")
    .replace(/^日本平動物園$/, "日本平動物園")
    .replace(/^市立日本平動物園$/, "日本平動物園");
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
  return `osm-zoo-${hash.toString(16).padStart(8, "0")}`;
}

function escapeString(value) {
  return JSON.stringify(value);
}

function sourceUrlFor(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function isLikelyStandaloneZoo(element) {
  const tags = element.tags ?? {};
  const name = getName(tags);
  if (!name) return false;
  if (EXISTING_PLACE_NAMES.has(name)) return false;
  if (EXACT_EXCLUDE_NAMES.has(name)) return false;
  if (!includesAny(name, INCLUDE_PATTERNS)) return false;
  if (includesAny(name, EXCLUDE_PATTERNS)) return false;
  if (/[（(](東園|西園|北園|南園|East|West|North|South)/i.test(name))
    return false;
  if (/(広場|エリア|コーナー|舎|館)$/.test(name)) return false;

  const hasEvidence =
    Boolean(tags.website) ||
    Boolean(tags["contact:website"]) ||
    Boolean(tags.wikidata) ||
    Boolean(tags["name:en"]) ||
    Boolean(tags["addr:province"]) ||
    Boolean(tags["addr:city"]) ||
    Boolean(tags["KSJ2:AAC"]);

  return (
    hasEvidence || /動物園|動物公園|サファリ|Zoological|Zoo|Safari/i.test(name)
  );
}

function toPlaceInput(element) {
  const tags = element.tags ?? {};
  const name = canonicalName(getName(tags));
  const { latitude, longitude } = getCoordinate(element);
  const osmUrl = sourceUrlFor(element);
  const placeId = slugify(`${element.type}/${element.id}`);
  const websiteUrl = officialWebsiteUrlFromTags(tags);
  const media = mediaFromOsmTags(tags, { id: placeId, name });
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
    id: placeId,
    name,
    category: "zoo",
    latitude,
    longitude,
    address: addressParts.length > 0 ? addressParts.join("") : "日本",
    municipalityCode: tags["KSJ2:AAC"] ?? `OSM-${element.type}-${element.id}`,
    shortDescription: `${name}として公開地図データに登録されている動物園です。来園前に公式情報を確認してください。`,
    suitableAgeMinMonths: 0,
    suitableAgeMaxMonths: 216,
    indoorOutdoor: "mixed",
    strollerFriendly: true,
    nursingRoom: undefined,
    diaperChanging: undefined,
    tags: ["stroller-friendly"],
    ...(media.length > 0 ? { media } : {}),
    websiteUrl,
    sourceUrl: websiteUrl ?? osmUrl,
    sourceCheckedAt: CHECKED_AT,
    status: "published",
    provenance: [
      {
        type: "open-data",
        name: "OpenStreetMap Overpass API tourism=zoo / amenity=zoo",
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
  if (tags.wikidata) score += 4;
  if (tags.website || tags["contact:website"]) score += 3;
  if (tags["addr:province"] || tags["addr:city"] || tags["KSJ2:AAC"])
    score += 2;
  if (/^(node|way)$/.test(element.type))
    score += element.type === "way" ? 1 : 0;
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
  if (typeof value === "string") return escapeString(value);
  return String(value);
}

function renderPlaceBlocks(blocks) {
  const entries = blocks.length > 0 ? `${blocks.join(",\n")},` : "";
  return `import type { PlaceInput } from '@kodoko/domain';

/**
 * Generated from OpenStreetMap Overpass API tourism=zoo / amenity=zoo.
 * Regenerate with:
 *   node tools/japan-zoos/collect-japan-zoos.mjs --output=apps/api/src/data/places/generated-zoos.ts
 */
export const generatedZooPlaces: PlaceInput[] = [
${entries}
];
`;
}

function renderPlaces(places) {
  return renderPlaceBlocks(places.map((place) => `  ${formatValue(place, 2)}`));
}

function extractGeneratedPlaceBlocks(source) {
  const arrayStartMarker = "export const generatedZooPlaces: PlaceInput[] = [";
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
    signal: AbortSignal.timeout(60_000),
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
  const query = `[out:json][timeout:120];
area["ISO3166-2"="${prefectureCode}"][admin_level=4]->.prefecture;
(
  nwr["tourism"="zoo"](area.prefecture);
  nwr["amenity"="zoo"](area.prefecture);
);
out center tags;`;

  return fetchElements(query);
}

async function collectFromElements(elements) {
  const byName = new Map();
  const places = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = getName(tags);
    const { latitude, longitude } = getCoordinate(element);
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude))
      continue;
    if (!isLikelyStandaloneZoo(element)) continue;
    const nameKey = canonicalName(name).normalize("NFKC");
    const previous = byName.get(nameKey);
    if (!previous || evidenceScore(element) > evidenceScore(previous)) {
      byName.set(nameKey, element);
    }
  }

  const selectedElements = [...byName.values()];
  await enrichOsmElementsWithWikidata(selectedElements);
  places.push(...selectedElements.map(toPlaceInput));

  places.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return places;
}

async function collectFromJson(inputPath) {
  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  return collectFromElements(payload.elements ?? []);
}

async function collect(prefectureCodes = PREFECTURE_CODES) {
  const elements = [];
  const failedPrefectureCodes = [];
  for (const prefectureCode of prefectureCodes) {
    let prefectureElements = [];
    try {
      prefectureElements = await collectPrefecture(prefectureCode);
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
      `Fetched ${prefectureElements.length} zoo candidates from ${prefectureCode}`,
    );
    elements.push(...prefectureElements);
  }

  const places = await collectFromElements(elements);
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
console.log(`Wrote ${places.length} generated zoo places to ${args.output}`);
