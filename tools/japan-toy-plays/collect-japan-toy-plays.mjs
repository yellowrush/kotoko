import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  enrichOsmElementsWithWikidata,
  mediaFromOsmTags,
  officialWebsiteUrlFromTags,
} from "../lib/osm-place-enrichment.mjs";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
const CHECKED_AT = "2026-08-12T00:00:00.000Z";
const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-toy-plays.ts";
const EXISTING_INPUTS = [
  "apps/api/src/data/places/base.ts",
  "apps/api/src/data/places/toy-plays.ts",
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
  "おもちゃ",
  "おもちゃ屋",
  "玩具",
  "Toy",
  "Toys",
  "Toy Shop",
]);

const INCLUDE_PATTERNS = [
  "おもちゃ美術館",
  "おもちゃ博物館",
  "玩具博物館",
  "おもちゃ図書館",
  "おもちゃライブラリー",
  "おもちゃ王国",
  "木育ひろば",
  "木育広場",
  "木育館",
  "木のおもちゃ",
  "木製玩具",
  "Toy Museum",
  "Toy Library",
  "Toys Museum",
];

const EXCLUDE_PATTERNS = [
  "トイザらス",
  "ベビーザらス",
  "ビックカメラ",
  "ヨドバシ",
  "ヤマダ",
  "イオン",
  "売場",
  "ショップ",
  "ストア",
  "店",
  "販売",
  "中古",
  "買取",
  "リサイクル",
  "会社",
  "株式会社",
  "工場",
  "倉庫",
  "本社",
  "事務所",
  "メーカー",
  "問屋",
  "卸",
  "トイレ",
  "駐車場",
  "入口",
  "駅",
  "バス停",
  "shop",
  "store",
  "retail",
  "company",
  "factory",
  "office",
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
    .replace(/^東京おもちゃ美術館$/, "東京おもちゃ美術館")
    .replace(/\s+/g, " ")
    .trim();
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
  return `osm-toy-play-${hash.toString(16).padStart(8, "0")}`;
}

function sourceUrlFor(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

async function getExistingPlaceNames(inputPaths = EXISTING_INPUTS) {
  const names = new Set();
  for (const inputPath of inputPaths) {
    try {
      const source = await readFile(inputPath, "utf8");
      for (const match of source.matchAll(/\bname:\s*'([^']+)'/g)) {
        names.add(canonicalName(match[1]).normalize("NFKC"));
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return names;
}

function isLikelyStandaloneToyPlay(element, existingNames) {
  const tags = element.tags ?? {};
  const rawName = getName(tags);
  const name = canonicalName(rawName);
  if (!name) return false;
  if (EXACT_EXCLUDE_NAMES.has(name)) return false;
  if (existingNames.has(name.normalize("NFKC"))) return false;
  if (includesAny(name, EXCLUDE_PATTERNS)) return false;
  if (tags.access === "private" || tags.access === "no") return false;
  if (tags.shop || tags["shop:toys"] || tags.craft) return false;
  if (!includesAny(name, INCLUDE_PATTERNS)) return false;

  const hasPublicEvidence =
    Boolean(tags.website) ||
    Boolean(tags["contact:website"]) ||
    Boolean(tags.wikidata) ||
    Boolean(tags["addr:province"]) ||
    Boolean(tags["addr:city"]) ||
    Boolean(tags["KSJ2:AAC"]) ||
    tags.tourism === "museum" ||
    tags.amenity === "library" ||
    tags.amenity === "community_centre" ||
    tags.leisure === "indoor_play" ||
    tags.leisure === "playground";

  return hasPublicEvidence;
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
    category: "toy-play",
    latitude,
    longitude,
    address: addressParts.length > 0 ? addressParts.join("") : "日本",
    municipalityCode: tags["KSJ2:AAC"] ?? `OSM-${element.type}-${element.id}`,
    shortDescription: `${name}として公開地図データに登録されているおもちゃ遊び場です。来館前に公式情報を確認してください。`,
    suitableAgeMinMonths: 0,
    suitableAgeMaxMonths: 144,
    indoorOutdoor: tags.leisure === "playground" ? "mixed" : "indoor",
    strollerFriendly: true,
    nursingRoom: undefined,
    diaperChanging: undefined,
    tags: ["group-play", "stroller-friendly"],
    ...(media.length > 0 ? { media } : {}),
    websiteUrl,
    sourceUrl: websiteUrl ?? osmUrl,
    sourceCheckedAt: CHECKED_AT,
    status: "published",
    provenance: [
      {
        type: "open-data",
        name: "OpenStreetMap Overpass API toy play candidates",
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
  if (tags.tourism === "museum") score += 4;
  if (tags.amenity === "library") score += 4;
  if (tags.wikidata) score += 4;
  if (tags.website || tags["contact:website"]) score += 3;
  if (tags["addr:province"] || tags["addr:city"] || tags["KSJ2:AAC"])
    score += 2;
  if (element.type === "way") score += 1;
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
 * Generated from OpenStreetMap Overpass API toy play candidates.
 * Regenerate with:
 *   node tools/japan-toy-plays/collect-japan-toy-plays.mjs --output=apps/api/src/data/places/generated-toy-plays.ts
 */
export const generatedToyPlayPlaces: PlaceInput[] = [
${entries}
];
`;
}

function extractGeneratedPlaceBlocks(source) {
  const arrayStartMarker =
    "export const generatedToyPlayPlaces: PlaceInput[] = [";
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
  nwr["name"~"おもちゃ美術館|おもちゃ博物館|玩具博物館|おもちゃ図書館|おもちゃライブラリー|おもちゃ王国|木育ひろば|木育広場|木育館|木のおもちゃ|木製玩具|Toy Museum|Toy Library|Toys Museum"](area.prefecture);
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
    if (!isLikelyStandaloneToyPlay(element, existingNames)) continue;
    const municipalityKey =
      tags["KSJ2:AAC"] ??
      tags["addr:city"] ??
      `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const nameKey = canonicalName(name).normalize("NFKC");
    const dedupeKey = `${nameKey}|${municipalityKey}`;
    const previous = byKey.get(dedupeKey);
    if (!previous || evidenceScore(element) > evidenceScore(previous)) {
      byKey.set(dedupeKey, element);
    }
  }

  const selectedElements = [...byKey.values()];
  await enrichOsmElementsWithWikidata(selectedElements);
  const places = selectedElements.map(toPlaceInput);
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
      `Fetched ${prefectureElements.length} toy-play candidates from ${prefectureCode}`,
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
console.log(
  `Wrote ${places.length} generated toy-play places to ${args.output}`,
);
