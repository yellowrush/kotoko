import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";
const CHECKED_AT = "2026-08-12T00:00:00.000Z";
const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-aquariums.ts";

const EXISTING_PLACE_NAMES = new Set([
  "葛西臨海水族園",
  "すみだ水族館",
  "サンシャイン水族館",
  "サンシャイン国際水族館",
]);

const EXACT_EXCLUDE_NAMES = new Set(["アクアテラス", "池", "水槽", "Aquarium"]);

const INCLUDE_PATTERNS = [
  "水族館",
  "水族園",
  "水族博物館",
  "海洋館",
  "海洋博物館",
  "海洋展示館",
  "海底館",
  "シーワールド",
  "シーパラダイス",
  "マリンワールド",
  "アクアリウム",
  "アクアワールド",
  "アクアス",
  "おさかな館",
  "魚っ知館",
  "Aquarium",
  "Sea World",
  "Marine World",
];

const EXCLUDE_PATTERNS = [
  "ショップ",
  "売店",
  "レストラン",
  "カフェ",
  "ホテル",
  "駐車場",
  "入口",
  "ゲート",
  "トイレ",
  "バス停",
  "駅",
  "水槽",
  "展示室",
  "コーナー",
  "ショップ",
  "restaurant",
  "cafe",
  "shop",
  "parking",
  "station",
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
    .replace(
      /^海の中道海洋生態科学館（マリンワールド海の中道）$/,
      "マリンワールド海の中道",
    )
    .replace(
      /^岐阜県世界淡水魚園水族館$/,
      "世界淡水魚園水族館 アクア・トトぎふ",
    )
    .replace(
      /^島根県立しまね海洋館（アクアス）$/,
      "島根県立しまね海洋館 アクアス",
    )
    .replace(/^関西電力宮津エネルギー研究所・丹後魚っ知館$/, "丹後魚っ知館")
    .replace(/^サンシャイン国際水族館$/, "サンシャイン水族館");
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
  return `osm-aquarium-${hash.toString(16).padStart(8, "0")}`;
}

function sourceUrlFor(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function isLikelyStandaloneAquarium(element) {
  const tags = element.tags ?? {};
  const rawName = getName(tags);
  const name = canonicalName(rawName);
  if (!name) return false;
  if (EXISTING_PLACE_NAMES.has(name)) return false;
  if (EXACT_EXCLUDE_NAMES.has(name)) return false;
  if (includesAny(name, EXCLUDE_PATTERNS)) return false;

  const taggedAquarium =
    tags.tourism === "aquarium" || tags.amenity === "aquarium";
  const namedAquarium = includesAny(name, INCLUDE_PATTERNS);
  if (!taggedAquarium && !namedAquarium) return false;

  const hasEvidence =
    Boolean(tags.website) ||
    Boolean(tags["contact:website"]) ||
    Boolean(tags.wikidata) ||
    Boolean(tags["name:en"]) ||
    Boolean(tags["addr:province"]) ||
    Boolean(tags["addr:city"]) ||
    Boolean(tags["KSJ2:AAC"]);

  return hasEvidence || namedAquarium;
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
    category: "aquarium",
    latitude,
    longitude,
    address: addressParts.length > 0 ? addressParts.join("") : "日本",
    municipalityCode: tags["KSJ2:AAC"] ?? `OSM-${element.type}-${element.id}`,
    shortDescription: `${name}として公開地図データに登録されている水族館です。来館前に公式情報を確認してください。`,
    suitableAgeMinMonths: 0,
    suitableAgeMaxMonths: 216,
    indoorOutdoor: "indoor",
    strollerFriendly: true,
    tags: ["stroller-friendly"],
    websiteUrl,
    sourceUrl: websiteUrl ?? osmUrl,
    sourceCheckedAt: CHECKED_AT,
    status: "published",
    provenance: [
      {
        type: "open-data",
        name: "OpenStreetMap Overpass API tourism=aquarium / amenity=aquarium",
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
  const entries = places
    .map((place) => `  ${formatValue(place, 2)}`)
    .join(",\n");
  return `import type { PlaceInput } from "@kodoko/domain";

/**
 * Generated from OpenStreetMap Overpass API tourism=aquarium / amenity=aquarium.
 * Regenerate with:
 *   node tools/japan-aquariums/collect-japan-aquariums.mjs --output=apps/api/src/data/places/generated-aquariums.ts
 */
export const generatedAquariumPlaces: PlaceInput[] = [
${entries},
];
`;
}

async function collect() {
  const query = `[out:json][timeout:120];
area["ISO3166-1"="JP"][admin_level=2]->.japan;
(
  nwr["tourism"="aquarium"](area.japan);
  nwr["amenity"="aquarium"](area.japan);
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
  for (const element of payload.elements ?? []) {
    const tags = element.tags ?? {};
    const name = getName(tags);
    const { latitude, longitude } = getCoordinate(element);
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude))
      continue;
    if (!isLikelyStandaloneAquarium(element)) continue;
    const nameKey = canonicalName(name).normalize("NFKC");
    const previous = byName.get(nameKey);
    if (!previous || evidenceScore(element) > evidenceScore(previous)) {
      byName.set(nameKey, element);
    }
  }

  const places = [...byName.values()].map(toPlaceInput);
  places.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return places;
}

const args = parseArgs(process.argv.slice(2));
const places = await collect();
await mkdir(dirname(args.output), { recursive: true });
await writeFile(args.output, renderPlaces(places), "utf8");
console.log(
  `Wrote ${places.length} generated aquarium places to ${args.output}`,
);
