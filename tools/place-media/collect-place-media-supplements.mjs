#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { seedPlaces } from "../../apps/api/src/data/places/index.ts";
import { generatedMediaSupplements } from "../../apps/api/src/data/places/generated-media-supplements.ts";

const DEFAULT_OUTPUT = "apps/api/src/data/places/generated-media-supplements.ts";
const USER_AGENT =
  "Kodoko public place media collector/0.1 (https://github.com/yellowrush/kotoko)";

const CATEGORY_LABELS = {
  "amusement-park": "遊園地",
  aquarium: "水族館",
  "children-hall": "児童館",
  facility: "施設",
  "indoor-play": "屋内遊び場",
  library: "図書館",
  museum: "博物館",
  park: "公園",
  playground: "児童遊園",
  restaurant: "レストラン",
  shop: "ショップ",
  "toy-play": "おもちゃ美術館",
  zoo: "動物園",
};

function parseArgs(argv) {
  const args = {
    delayMs: 250,
    dryRun: false,
    ids: undefined,
    categories: undefined,
    limit: Number.POSITIVE_INFINITY,
    output: DEFAULT_OUTPUT,
    sources: new Set(["official", "commons"]),
    targetMediaCount: 3,
    checkedAt: new Date().toISOString(),
    reset: false,
    replaceSelected: false,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--reset") args.reset = true;
    if (arg === "--replace-selected") args.replaceSelected = true;
    if (arg.startsWith("--categories=")) {
      args.categories = new Set(splitList(arg.slice("--categories=".length)));
    }
    if (arg.startsWith("--ids=")) {
      args.ids = new Set(splitList(arg.slice("--ids=".length)));
    }
    if (arg.startsWith("--limit=")) {
      args.limit = Number(arg.slice("--limit=".length));
    }
    if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length);
    }
    if (arg.startsWith("--sources=")) {
      args.sources = new Set(splitList(arg.slice("--sources=".length)));
    }
    if (arg.startsWith("--target=")) {
      args.targetMediaCount = Number(arg.slice("--target=".length));
    }
    if (arg.startsWith("--delay-ms=")) {
      args.delayMs = Number(arg.slice("--delay-ms=".length));
    }
    if (arg.startsWith("--checked-at=")) {
      args.checkedAt = arg.slice("--checked-at=".length);
    }
  }

  return args;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlaceholderMedia(media) {
  return (
    media.url.includes("/media/placeholder/") ||
    /placeholder/i.test(media.license ?? "")
  );
}

function isRealMedia(media) {
  return !isPlaceholderMedia(media);
}

function placeNeedsMediaRepair(place) {
  return place.media.length === 0 || place.media.some(isPlaceholderMedia);
}

function isLikelyWebsite(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      /^https?:$/.test(parsed.protocol) &&
      !/\.(jpe?g|png|gif|webp|svg|mp4)(?:[?#].*)?$/i.test(parsed.pathname) &&
      !/(^|\.)openstreetmap\.org$/i.test(parsed.hostname) &&
      !/(^|\.)commons\.wikimedia\.org$/i.test(parsed.hostname) &&
      !/(^|\.)wikimedia\.org$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeCandidateUrl(raw, baseUrl) {
  if (typeof raw !== "string") return undefined;
  const value = decodeHtmlEntities(raw)
    .replace(/\\\//g, "/")
    .trim();
  if (!value || /^(data|blob|javascript):/i.test(value)) return undefined;

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

function getAttr(tag, attr) {
  const match = tag.match(
    new RegExp(`${attr}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i"),
  );
  if (!match) return undefined;
  return match[1].replace(/^["']|["']$/g, "");
}

function isLikelyNonPhotoUrl(url) {
  const text = decodeURIComponent(url).toLowerCase();
  return /favicon|apple-touch-icon|sprite|blank|noimage|no-image|placeholder|noscript|clearspacer|map-pin|marker|logo|slogo|rogo|line_add_friends|twitter-badges|(?:^|[\/._-])ogp(?:[\/._-]|$)|ogpimage|ogimage|og-image|og_image|og_img|ogimg|facebook|(?:^|[\/._-])fb(?:[\/._-]|$)|summary[_-]?large[_-]?image|summary[_-]?image|twitter[_-]?card|\/sns\/|sns[_-]?bt|img-instagram|thumbnail\.(?:png|jpe?g|webp)(?:$|[?#])|result-hk|(?:^|[\/._-])(?:icon|ico|btn\d*|button|bnr\d*|banner|deco|arrow|loading|search|brand|nav|navi|map|sns|txt|text|ttl|title|h\d+|download|pop[_-]?bn|ba[_-]|sp[_-]?open|top[_-]?mark|top[_-]?title|about[_-]?link|hero[_-]?cloud\d*|visual[_-]?copy|func[_-]?clr|func[_-]?txt|fix[_-]?search|bt[_-]?blog|information\d*|city\d*|dummy|dammy|close)(?:[\/._@-]|$)|(?:^|[\/._-])bg[_-]|[au]\d{3}ani\.gif/.test(
    text,
  );
}

function isLikelyImageUrl(url) {
  try {
    const parsed = new URL(url);
    return /\.(jpe?g|png|gif|webp)(?:$|[?#])/i.test(parsed.href);
  } catch {
    return false;
  }
}

function isLikelyVideoUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      /\.(mp4|webm|mov)(?:$|[?#])/i.test(parsed.href) ||
      /(^|\.)youtube\.com$/i.test(parsed.hostname) ||
      /(^|\.)youtu\.be$/i.test(parsed.hostname) ||
      /(^|\.)vimeo\.com$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function isLikelyPhotoAssetUrl(url) {
  try {
    const parsed = new URL(url);
    return /\.(jpe?g|webp)(?:$|[?#])/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function uniqueByUrl(media) {
  const seen = new Set();
  return media.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function withSingleCover(media) {
  const copy = media.map((item) => {
    const next = { ...item };
    delete next.cover;
    return next;
  });
  const coverIndex = Math.max(
    0,
    copy.findIndex((item) => item.type === "image"),
  );
  if (copy[coverIndex]) copy[coverIndex].cover = true;
  return copy;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !/text\/html|application\/xhtml\+xml|application\/xml|text\/plain/i.test(
      contentType,
    )
  ) {
    return "";
  }
  return await response.text();
}

function collectJsonLdImageValues(value, output) {
  if (!value) return;
  if (typeof value === "string") {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdImageValues(item, output);
    return;
  }
  if (typeof value !== "object") return;

  for (const key of ["contentUrl", "image", "photo", "thumbnailUrl"]) {
    collectJsonLdImageValues(value[key], output);
  }
  if (typeof value.url === "string" && isLikelyImageUrl(value.url)) {
    output.push(value.url);
  }
}

function extractJsonLdImages(html) {
  const values = [];
  const blocks = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const block of blocks) {
    try {
      collectJsonLdImageValues(JSON.parse(block[1]), values);
    } catch {
      // Ignore malformed structured data from public websites.
    }
  }

  return values;
}

function extractSrcsetUrls(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function extractImageTagUrls(html) {
  const urls = [];

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    for (const attr of [
      "src",
      "data-src",
      "data-original",
      "data-lazy-src",
      "data-echo",
    ]) {
      const value = getAttr(tag, attr);
      if (value) urls.push(value);
    }
    for (const attr of ["srcset", "data-srcset"]) {
      urls.push(...extractSrcsetUrls(getAttr(tag, attr)));
    }
  }

  return urls;
}

function mediaFromOfficialHtml(html, pageUrl, place, startIndex) {
  const imageCandidates = [];
  const videoUrls = [];

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (getAttr(tag, "property") ?? getAttr(tag, "name") ?? "")
      .trim()
      .toLowerCase();
    const content = getAttr(tag, "content");
    if (!content) continue;
    if (
      [
        "og:image",
        "og:image:url",
        "og:image:secure_url",
        "twitter:image",
        "twitter:image:src",
      ].includes(key)
    ) {
      imageCandidates.push({ raw: content, source: "metadata" });
    }
    if (["og:video", "og:video:url", "og:video:secure_url"].includes(key)) {
      videoUrls.push(content);
    }
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (getAttr(tag, "rel") ?? "").toLowerCase();
    const href = getAttr(tag, "href");
    if (rel.includes("image_src") && href) {
      imageCandidates.push({ raw: href, source: "metadata" });
    }
  }

  imageCandidates.push(
    ...extractJsonLdImages(html).map((raw) => ({ raw, source: "json-ld" })),
  );
  imageCandidates.push(
    ...extractImageTagUrls(html).map((raw) => ({ raw, source: "img" })),
  );

  const media = [];
  for (const candidate of imageCandidates) {
    const { raw, source } = candidate;
    const url = normalizeCandidateUrl(raw, pageUrl);
    if (!url || !isLikelyImageUrl(url) || isLikelyNonPhotoUrl(url)) continue;
    if (source === "img" && !isLikelyPhotoAssetUrl(url)) continue;
    media.push({
      id: `${place.id}-official-image-${startIndex + media.length}`,
      type: "image",
      url,
      alt: `${place.name} official image`,
      credit: "Official website",
      license: "official-site-image",
      sourceUrl: pageUrl,
    });
  }

  for (const raw of videoUrls) {
    const url = normalizeCandidateUrl(raw, pageUrl);
    if (!url || !isLikelyVideoUrl(url)) continue;
    media.push({
      id: `${place.id}-official-video-${startIndex + media.length}`,
      type: "video",
      url,
      alt: `${place.name} official video`,
      credit: "Official website",
      license: "official-site-video",
      sourceUrl: pageUrl,
    });
  }

  return uniqueByUrl(media);
}

async function collectOfficialMedia(place, startIndex) {
  const pageUrl = isLikelyWebsite(place.websiteUrl)
    ? place.websiteUrl
    : isLikelyWebsite(place.sourceUrl)
      ? place.sourceUrl
      : undefined;
  if (!pageUrl) return [];

  const html = await fetchHtml(pageUrl);
  if (!html) return [];
  return mediaFromOfficialHtml(html, pageUrl, place, startIndex);
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

async function commonsQuery(search, limit) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(limit),
    gsrsearch: search,
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1280",
    prop: "imageinfo",
  });
  const response = await fetch(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return await response.json();
}

function mediaFromCommonsPage(page, place, startIndex) {
  const imageInfo = page.imageinfo?.[0];
  if (!imageInfo?.url || !/^image\//i.test(imageInfo.mime ?? "")) {
    return undefined;
  }
  if (!commonsPageLooksRelevant(page, place)) return undefined;

  const license = stripHtml(imageInfo.extmetadata?.LicenseShortName?.value);
  const artist = stripHtml(imageInfo.extmetadata?.Artist?.value);

  return {
    id: `${place.id}-commons-image-${startIndex}`,
    type: "image",
    url: imageInfo.thumburl ?? imageInfo.url,
    alt: `${place.name} public image`,
    credit: artist ? `${artist} / Wikimedia Commons` : "Wikimedia Commons",
    license: license || "Wikimedia Commons",
    sourceUrl: imageInfo.descriptionurl,
  };
}

function normalizeTextForMatch(value) {
  return decodeURIComponent(String(value ?? ""))
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function isTooGenericCommonsSearchName(place) {
  const target = normalizeTextForMatch(place.name);
  return (
    target.length < 4 ||
    [
      "本館",
      "水族館",
      "ミニ水族館",
      "つどいの広場",
      "子育て支援センター",
    ].includes(place.name)
  );
}

function commonsPageLooksRelevant(page, place) {
  if (isTooGenericCommonsSearchName(place)) return false;
  const imageInfo = page.imageinfo?.[0] ?? {};
  const target = normalizeTextForMatch(place.name);
  if (!target) return false;
  const searchableText = normalizeTextForMatch(
    [page.title, imageInfo.url, imageInfo.descriptionurl].join(" "),
  );
  return searchableText.includes(target);
}

async function collectCommonsMedia(place, startIndex, needed) {
  const searches = [
    `"${place.name}"`,
    `${place.name} ${CATEGORY_LABELS[place.category] ?? ""}`.trim(),
  ];
  const media = [];

  for (const search of searches) {
    if (media.length >= needed) break;
    const payload = await commonsQuery(search, Math.max(needed * 3, 6));
    const pages = Object.values(payload.query?.pages ?? {});
    for (const page of pages) {
      if (media.length >= needed) break;
      const item = mediaFromCommonsPage(page, place, startIndex + media.length);
      if (item) media.push(item);
    }
  }

  return uniqueByUrl(media);
}

function selectPlaces(args) {
  return seedPlaces
    .filter((place) => args.replaceSelected || placeNeedsMediaRepair(place))
    .filter((place) => !args.ids || args.ids.has(place.id))
    .filter((place) => !args.categories || args.categories.has(place.category))
    .slice(0, args.limit);
}

function mergeMedia(existingRealMedia, collectedMedia, targetMediaCount) {
  return withSingleCover(
    uniqueByUrl([...existingRealMedia, ...collectedMedia]).slice(
      0,
      targetMediaCount,
    ),
  );
}

function existingMediaLooksRelevant(place, media) {
  const altPrefix = media.alt?.split(/[|｜]/)[0]?.trim();
  if (!altPrefix) return true;
  return (
    altPrefix === place.name ||
    altPrefix.includes(place.name) ||
    place.name.includes(altPrefix)
  );
}

function serializableSupplements(supplements) {
  return Object.fromEntries(
    Object.entries(supplements).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function renderSupplementsFile(supplements, checkedAt) {
  return `import type { PlaceInput } from "@kodoko/domain";

/**
 * Generated public media supplements for places whose base/generated record has
 * no reusable image or still uses a placeholder.
 *
 * Last generated: ${checkedAt}
 * Regenerate with:
 *   apps/api/node_modules/.bin/tsx.CMD tools/place-media/collect-place-media-supplements.mjs
 */
export const generatedMediaSupplements: Record<string, Partial<PlaceInput>> = ${JSON.stringify(
    serializableSupplements(supplements),
    null,
    2,
  )};
`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const args = parseArgs(process.argv.slice(2));
const supplements = args.reset
  ? {}
  : JSON.parse(JSON.stringify(generatedMediaSupplements));
const selectedPlaces = selectPlaces(args);
if (args.replaceSelected) {
  for (const place of selectedPlaces) {
    delete supplements[place.id];
  }
}
let updated = 0;
let failed = 0;

console.log(
  JSON.stringify(
    {
      selected: selectedPlaces.length,
      categories: args.categories ? [...args.categories] : "all",
      sources: [...args.sources],
      targetMediaCount: args.targetMediaCount,
      output: args.output,
      dryRun: args.dryRun,
      reset: args.reset,
      replaceSelected: args.replaceSelected,
    },
    null,
    2,
  ),
);

for (const place of selectedPlaces) {
  const existingPatchMedia = supplements[place.id]?.media ?? [];
  const existingRealMedia = args.replaceSelected
    ? []
    : [...place.media, ...existingPatchMedia].filter(
        (media) =>
          isRealMedia(media) &&
          existingMediaLooksRelevant(place, media) &&
          !isLikelyNonPhotoUrl(media.url),
      );
  const collectedMedia = [];
  const needed = Math.max(0, args.targetMediaCount - existingRealMedia.length);

  try {
    if (needed > 0 && args.sources.has("official")) {
      collectedMedia.push(
        ...(await collectOfficialMedia(
          place,
          existingRealMedia.length + collectedMedia.length + 1,
        )),
      );
    }
    if (
      existingRealMedia.length + collectedMedia.length < args.targetMediaCount &&
      args.sources.has("commons")
    ) {
      collectedMedia.push(
        ...(await collectCommonsMedia(
          place,
          existingRealMedia.length + collectedMedia.length + 1,
          args.targetMediaCount - existingRealMedia.length - collectedMedia.length,
        )),
      );
    }

    const mergedMedia = mergeMedia(
      existingRealMedia,
      collectedMedia,
      args.targetMediaCount,
    );
    if (mergedMedia.length > 0) {
      supplements[place.id] = {
        ...(supplements[place.id] ?? {}),
        media: mergedMedia,
      };
      updated += 1;
      console.log(
        `[updated] ${place.id} ${place.name} media=${mergedMedia.length}`,
      );
    } else {
      console.log(`[missing] ${place.id} ${place.name}`);
    }
  } catch (error) {
    failed += 1;
    console.warn(
      `[failed] ${place.id} ${place.name}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (args.delayMs > 0) await sleep(args.delayMs);
}

if (!args.dryRun) {
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(
    args.output,
    renderSupplementsFile(supplements, args.checkedAt),
    "utf8",
  );
}

console.log(JSON.stringify({ updated, failed }, null, 2));
