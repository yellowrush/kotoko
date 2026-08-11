import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
const CHECKED_AT = "2026-08-11T00:00:00.000Z";
const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-zoos.ts";

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
  const args = { output: DEFAULT_OUTPUT };
  for (const arg of argv) {
    if (arg.startsWith("--output="))
      args.output = arg.slice("--output=".length);
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

function renderPlaces(places) {
  const entries = places
    .map((place) => `  ${formatValue(place, 2)}`)
    .join(",\n");
  return `import type { PlaceInput } from '@kodoko/domain';

/**
 * Generated from OpenStreetMap Overpass API tourism=zoo / amenity=zoo.
 * Regenerate with:
 *   node tools/japan-zoos/collect-japan-zoos.mjs --output=apps/api/src/data/places/generated-zoos.ts
 */
export const generatedZooPlaces: PlaceInput[] = [
${entries},
];
`;
}

async function collect() {
  const query = `[out:json][timeout:120];
area["ISO3166-1"="JP"][admin_level=2]->.japan;
(
  nwr["tourism"="zoo"](area.japan);
  nwr["amenity"="zoo"](area.japan);
);
out center tags;`;

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
  const byName = new Map();
  const places = [];
  for (const element of payload.elements ?? []) {
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

  for (const element of byName.values()) {
    places.push(toPlaceInput(element));
  }

  places.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return places;
}

const args = parseArgs(process.argv.slice(2));
const places = await collect();
await mkdir(dirname(args.output), { recursive: true });
await writeFile(args.output, renderPlaces(places), "utf8");
console.log(`Wrote ${places.length} generated zoo places to ${args.output}`);
