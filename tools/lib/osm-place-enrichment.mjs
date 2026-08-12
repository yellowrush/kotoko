const WIKIDATA_API_ENDPOINT =
  process.env.WIKIDATA_API_ENDPOINT ?? "https://www.wikidata.org/w/api.php";
const WIKIDATA_IMAGE_KEY = "kodoko:wikidata:image";
const WIKIDATA_WEBSITE_KEY = "kodoko:wikidata:official_website";

const WEBSITE_KEYS = [
  "website",
  "contact:website",
  "contact:url",
  "url",
  WIKIDATA_WEBSITE_KEY,
];
const IMAGE_KEYS = ["image", "image:url"];
const COMMONS_KEYS = [
  "wikimedia_commons",
  "wikimedia:commons",
  WIKIDATA_IMAGE_KEY,
];
const VIDEO_KEYS = ["video", "youtube", "contact:youtube"];

function firstString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value) {
  const raw = firstString(value);
  if (!raw) return undefined;
  const match = raw.match(/https?:\/\/[^\s;|,]+/i);
  if (match) return match[0];
  if (/^www\.[^\s;|,]+$/i.test(raw)) return `https://${raw}`;
  return undefined;
}

function normalizeWikidataId(value) {
  const raw = firstString(value);
  if (!raw) return undefined;
  const match = raw.match(/(?:^|\/)(Q\d+)(?:[#?/]|$)/i);
  return match?.[1].toUpperCase();
}

function isLikelyWebsite(url) {
  if (!url) return false;
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    !/^(mailto|tel):/i.test(url) &&
    !/\.(jpe?g|png|gif|webp|svg)(?:[?#].*)?$/i.test(url) &&
    !/(^|\.)facebook\.com$/.test(hostname) &&
    !/(^|\.)instagram\.com$/.test(hostname) &&
    !/(^|\.)x\.com$/.test(hostname) &&
    !/(^|\.)twitter\.com$/.test(hostname) &&
    !/(^|\.)youtube\.com$/.test(hostname) &&
    !/(^|\.)photos\.app\.goo\.gl$/.test(hostname) &&
    !/(^|\.)maps\.app\.goo\.gl$/.test(hostname) &&
    !/(^|\.)maps\.google\.com$/.test(hostname) &&
    !/(^|\.)tripadvisor\./.test(hostname) &&
    !/(^|\.)tabelog\./.test(hostname) &&
    !/(^|\.)hotpepper\./.test(hostname) &&
    !/(^|\.)gnavi\./.test(hostname) &&
    !/(^|\.)jalan\./.test(hostname) &&
    !/(^|\.)navitime\./.test(hostname) &&
    !/(^|\.)ekiten\./.test(hostname)
  );
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function firstWikidataStringClaim(entity, propertyId) {
  const claims = entity?.claims?.[propertyId] ?? [];
  for (const claim of claims) {
    const value = claim?.mainsnak?.datavalue?.value;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

async function fetchWikidataClaims(ids) {
  const entities = new Map();
  for (const idChunk of chunk([...ids], 50)) {
    try {
      const response = await fetch(WIKIDATA_API_ENDPOINT, {
        method: "POST",
        headers: {
          "User-Agent":
            "Kodoko data collection bot/0.1 (https://github.com/yellowrush/kotoko)",
        },
        body: new URLSearchParams({
          action: "wbgetentities",
          format: "json",
          props: "claims",
          ids: idChunk.join("|"),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        console.warn(
          `Skipped Wikidata enrichment batch: ${response.status} ${response.statusText}`,
        );
        continue;
      }
      const payload = await response.json();
      for (const [id, entity] of Object.entries(payload.entities ?? {})) {
        entities.set(id, entity);
      }
    } catch (error) {
      console.warn(
        `Skipped Wikidata enrichment batch: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return entities;
}

function isDirectImageUrl(url) {
  return /\.(jpe?g|png|gif|webp|svg)(?:[?#].*)?$/i.test(url);
}

function uniqueByUrl(media) {
  const seen = new Set();
  return media.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function commonsFileName(value) {
  const raw = firstString(value);
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  const fileMatch =
    decoded.match(/(?:^|\/)File:([^#?]+)/i) ??
    decoded.match(/Special:FilePath\/([^#?]+)/i);
  if (fileMatch) return fileMatch[1].replace(/_/g, " ").trim();
  if (/^File:/i.test(decoded)) return decoded.slice("File:".length).trim();
  return undefined;
}

function commonsMediaFromValue(value, id, name, index) {
  const fileName = commonsFileName(value);
  if (!fileName) return undefined;
  const encodedFileName = encodeURIComponent(fileName).replace(/%20/g, "_");
  return {
    id: `${id}-commons-${index}`,
    type: "image",
    url: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodedFileName}`,
    alt: `${name} public image`,
    credit: "Wikimedia Commons",
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodedFileName}`,
  };
}

function directImageMediaFromValue(value, id, name, index) {
  const url = normalizeUrl(value);
  if (!url) return undefined;
  const commons = commonsMediaFromValue(url, id, name, index);
  if (commons) return commons;
  if (!isDirectImageUrl(url)) return undefined;
  return {
    id: `${id}-image-${index}`,
    type: "image",
    url,
    alt: `${name} public image`,
    sourceUrl: url,
  };
}

function videoMediaFromValue(value, id, name, index) {
  const url = normalizeUrl(value);
  if (!url) return undefined;
  return {
    id: `${id}-video-${index}`,
    type: "video",
    url,
    alt: `${name} public video`,
    sourceUrl: url,
  };
}

export function officialWebsiteUrlFromTags(tags) {
  for (const key of WEBSITE_KEYS) {
    const url = normalizeUrl(tags[key]);
    if (isLikelyWebsite(url)) return url;
  }
  return undefined;
}

export function mediaFromOsmTags(tags, { id, name }) {
  const media = [];

  for (const key of IMAGE_KEYS) {
    const item = directImageMediaFromValue(
      tags[key],
      id,
      name,
      media.length + 1,
    );
    if (item) media.push(item);
  }

  for (const key of COMMONS_KEYS) {
    const item = commonsMediaFromValue(tags[key], id, name, media.length + 1);
    if (item) media.push(item);
  }

  for (const key of VIDEO_KEYS) {
    const item = videoMediaFromValue(tags[key], id, name, media.length + 1);
    if (item) media.push(item);
  }

  const deduped = uniqueByUrl(media);
  const firstImage = deduped.find((item) => item.type === "image");
  if (firstImage) firstImage.cover = true;
  return deduped;
}

export async function enrichOsmElementsWithWikidata(elements) {
  const ids = new Set();
  for (const element of elements) {
    const id = normalizeWikidataId(element.tags?.wikidata);
    if (id) ids.add(id);
  }
  if (ids.size === 0) {
    return { ids: 0, images: 0, websites: 0 };
  }

  const entities = await fetchWikidataClaims(ids);
  let images = 0;
  let websites = 0;

  for (const element of elements) {
    const tags = element.tags ?? {};
    const entity = entities.get(normalizeWikidataId(tags.wikidata));
    if (!entity) continue;

    const imageName = firstWikidataStringClaim(entity, "P18");
    if (imageName && !tags[WIKIDATA_IMAGE_KEY]) {
      tags[WIKIDATA_IMAGE_KEY] = `File:${imageName}`;
      images += 1;
    }

    const websiteUrl = normalizeUrl(firstWikidataStringClaim(entity, "P856"));
    if (isLikelyWebsite(websiteUrl) && !tags[WIKIDATA_WEBSITE_KEY]) {
      tags[WIKIDATA_WEBSITE_KEY] = websiteUrl;
      websites += 1;
    }
  }

  return { ids: ids.size, images, websites };
}
