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
const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-libraries.ts";
const EXISTING_INPUTS = [
  "apps/api/src/data/places/base.ts",
  "apps/api/src/data/places/libraries-sports.ts",
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
  "図書館",
  "図書室",
  "Library",
  "library",
  "Books",
  "Book Corner",
]);

const EXCLUDE_PATTERNS = [
  "大学",
  "短期大学",
  "高等専門学校",
  "専門学校",
  "高校",
  "高等学校",
  "中学校",
  "小学校",
  "学校",
  "学園",
  "キャンパス",
  "研究所",
  "企業",
  "会社",
  "病院",
  "職員",
  "社員",
  "学生",
  "校内",
  "教会",
  "寺",
  "ホテル",
  "カフェ",
  "喫茶",
  "レストラン",
  "売店",
  "書店",
  "古書店",
  "本屋",
  "ブックオフ",
  "駐車場",
  "入口",
  "ゲート",
  "トイレ",
  "バス停",
  "駅",
  "university",
  "college",
  "school",
  "campus",
  "laboratory",
  "hospital",
  "staff",
  "student",
  "company",
  "corporate",
  "office",
  "church",
  "temple",
  "hotel",
  "cafe",
  "restaurant",
  "shop",
  "bookstore",
  "parking",
  "station",
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
    .replace(/^公立 /, "")
    .replace(/^公立/, "")
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
  return `osm-library-${hash.toString(16).padStart(8, "0")}`;
}

function sourceUrlFor(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function placeKey(name, tags, element) {
  const municipalityCode = tags["KSJ2:AAC"];
  if (municipalityCode) return `${canonicalName(name)}|${municipalityCode}`;
  return `${canonicalName(name)}|${element.type}/${element.id}`;
}

function extractPlaceNamesFromSource(content) {
  return [...content.matchAll(/\bname:\s*(['"])(.*?)\1/gms)].map((match) =>
    normalizeName(match[2]),
  );
}

async function getExistingPlaceNames() {
  const names = new Set();
  for (const input of EXISTING_INPUTS) {
    try {
      for (const name of extractPlaceNamesFromSource(
        await readFile(input, "utf8"),
      )) {
        names.add(name);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return names;
}

function isLikelyPublicLibrary(element, existingNames) {
  const tags = element.tags ?? {};
  const rawName = getName(tags);
  const name = canonicalName(rawName);
  if (!name) return false;
  if (existingNames.has(name)) return false;
  if (EXACT_EXCLUDE_NAMES.has(name)) return false;
  if (includesAny(name, EXCLUDE_PATTERNS)) return false;
  if (tags.amenity !== "library") return false;
  if (tags.access === "private" || tags.access === "no") return false;
  if (tags.access === "students" || tags.access === "employees") return false;
  if (tags["library:for"] === "students") return false;
  if (tags.operator?.match(/大学|学校|University|School/i)) return false;
  return true;
}

function evidenceScore(element) {
  const tags = element.tags ?? {};
  let score = 0;
  if (tags.website || tags["contact:website"]) score += 8;
  if (tags.wikidata) score += 5;
  if (tags["name:ja"]) score += 3;
  if (tags["addr:province"]) score += 2;
  if (tags["addr:city"]) score += 2;
  if (tags["KSJ2:AAC"]) score += 2;
  if (element.type === "relation") score += 1;
  if (element.type === "way") score += 1;
  return score;
}

function addressFor(tags) {
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
  return addressParts.length > 0 ? addressParts.join("") : "日本";
}

function toPlaceInput(element) {
  const tags = element.tags ?? {};
  const name = canonicalName(getName(tags));
  const { latitude, longitude } = getCoordinate(element);
  const osmUrl = sourceUrlFor(element);
  const placeId = slugify(`${element.type}/${element.id}`);
  const websiteUrl = officialWebsiteUrlFromTags(tags);
  const media = mediaFromOsmTags(tags, { id: placeId, name });

  return {
    id: placeId,
    name,
    category: "library",
    latitude,
    longitude,
    address: addressFor(tags),
    municipalityCode: tags["KSJ2:AAC"] ?? `OSM-${element.type}-${element.id}`,
    shortDescription: `${name}として公開地図データに登録されている図書館です。利用前に公式情報を確認してください。`,
    suitableAgeMinMonths: 0,
    suitableAgeMaxMonths: 216,
    indoorOutdoor: "indoor",
    priceLevel: 0,
    strollerFriendly: true,
    tags: ["quiet-zone", "stroller-friendly"],
    ...(media.length > 0 ? { media } : {}),
    ...(websiteUrl
      ? {
          websiteUrl,
          sourceUrl: websiteUrl,
        }
      : { sourceUrl: osmUrl }),
    sourceCheckedAt: CHECKED_AT,
    status: "published",
    provenance: [
      {
        type: "open-data",
        name: "OpenStreetMap Overpass API amenity=library",
        url: osmUrl,
        fetchedAt: CHECKED_AT,
      },
    ],
  };
}

function formatValue(value, indent = 0) {
  const space = " ".repeat(indent);
  const childSpace = " ".repeat(indent + 2);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value
      .map((item) => `${childSpace}${formatValue(item, indent + 2)}`)
      .join(",\n")},\n${space}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(
      ([, entryValue]) => entryValue !== undefined,
    );
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(
        ([key, entryValue]) =>
          `${childSpace}${JSON.stringify(key)}: ${formatValue(
            entryValue,
            indent + 2,
          )}`,
      )
      .join(",\n")},\n${space}}`;
  }

  return JSON.stringify(value);
}

function renderPlaceBlocks(blocks) {
  return `import type { PlaceInput } from "@kodoko/domain";

/**
 * Generated from OpenStreetMap Overpass API amenity=library.
 * Regenerate with:
 *   node tools/japan-libraries/collect-japan-libraries.mjs --output=apps/api/src/data/places/generated-libraries.ts
 */
export const generatedLibraryPlaces: PlaceInput[] = [
${blocks.join(",\n")}
];
`;
}

function renderPlaces(places) {
  return renderPlaceBlocks(places.map((place) => `  ${formatValue(place, 2)}`));
}

function extractGeneratedPlaceBlocks(content) {
  const arrayStart = content.indexOf("[");
  const arrayEnd = content.lastIndexOf("]");
  if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) return [];

  const body = content.slice(arrayStart + 1, arrayEnd);
  const blocks = [];
  let depth = 0;
  let blockStart = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
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
        blocks.push(`  ${body.slice(blockStart, index + 1).trim()}`);
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
  const query = `[out:json][timeout:120];
area["ISO3166-2"="${prefectureCode}"][admin_level=4]->.prefecture;
(
  nwr["amenity"="library"](area.prefecture);
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
    if (!isLikelyPublicLibrary(element, existingNames)) continue;
    const key = placeKey(name, tags, element);
    const previous = byKey.get(key);
    if (!previous || evidenceScore(element) > evidenceScore(previous)) {
      byKey.set(key, element);
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
    try {
      const prefectureElements = await collectPrefecture(prefectureCode);
      console.log(
        `Fetched ${prefectureElements.length} library candidates from ${prefectureCode}`,
      );
      elements.push(...prefectureElements);
    } catch (error) {
      failedPrefectureCodes.push(prefectureCode);
      console.warn(
        `Skipped ${prefectureCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  if (failedPrefectureCodes.length > 0) {
    console.warn(
      `Skipped ${failedPrefectureCodes.length} prefectures: ${failedPrefectureCodes.join(
        ", ",
      )}`,
    );
  }
  return collectFromElements(elements);
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
  `Wrote ${places.length} generated library places to ${args.output}`,
);
