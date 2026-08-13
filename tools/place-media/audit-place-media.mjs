#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { seedPlaces } from "../../apps/api/src/data/places/index.ts";
import { getGoogleMapsSearchUrl } from "../../apps/web/src/components/places/placePlaceholderMedia.ts";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length);
    }
  }
  return args;
}

function isPlaceholderMedia(media) {
  return (
    media.url.includes("/media/placeholder/") ||
    /placeholder/i.test(media.license ?? "")
  );
}

function mediaStatus(place) {
  if (place.media.length === 0) return "empty";
  if (place.media.every(isPlaceholderMedia)) return "placeholderOnly";
  if (place.media.some(isPlaceholderMedia)) return "mixedPlaceholder";
  return "real";
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function validateGoogleMapsFallback(place) {
  try {
    const url = getGoogleMapsSearchUrl(place);
    const parsed = new URL(url);
    const query = parsed.searchParams.get("query") ?? "";
    const coordinates = `${place.latitude},${place.longitude}`;

    return {
      ok:
        parsed.origin === "https://www.google.com" &&
        parsed.pathname === "/maps/search/" &&
        parsed.searchParams.get("api") === "1" &&
        query.includes(place.name) &&
        query.includes(coordinates),
      url,
      query,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildReport() {
  const byStatus = {};
  const byCategory = {};
  const missing = [];
  const missingWithoutGoogleMapsFallback = [];

  for (const place of seedPlaces) {
    const status = mediaStatus(place);
    increment(byStatus, status);

    byCategory[place.category] ??= {
      total: 0,
      empty: 0,
      placeholderOnly: 0,
      mixedPlaceholder: 0,
      real: 0,
    };
    byCategory[place.category].total += 1;
    byCategory[place.category][status] += 1;

    if (status !== "real") {
      const googleMapsFallback = validateGoogleMapsFallback(place);

      missing.push({
        id: place.id,
        name: place.name,
        category: place.category,
        status,
        mediaCount: place.media.length,
        websiteUrl: place.websiteUrl,
        sourceUrl: place.sourceUrl,
        latitude: place.latitude,
        longitude: place.longitude,
        googleMapsFallback,
      });

      if (!googleMapsFallback.ok) {
        missingWithoutGoogleMapsFallback.push({
          id: place.id,
          name: place.name,
          category: place.category,
          status,
          googleMapsFallback,
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    total: seedPlaces.length,
    byStatus,
    byCategory,
    missingCount: missing.length,
    googleMapsFallback: {
      covered: missing.length - missingWithoutGoogleMapsFallback.length,
      missing: missingWithoutGoogleMapsFallback.length,
    },
    missingWithoutGoogleMapsFallback,
    missing,
  };
}

const args = parseArgs(process.argv.slice(2));
const report = buildReport();

if (args.output) {
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(
  JSON.stringify(
    {
      total: report.total,
      byStatus: report.byStatus,
      byCategory: report.byCategory,
      missingCount: report.missingCount,
      googleMapsFallback: report.googleMapsFallback,
    },
    null,
    2,
  ),
);
