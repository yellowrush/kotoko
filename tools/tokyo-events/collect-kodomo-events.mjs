import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const SITE = 'https://tokyo-kodomo-hp.metro.tokyo.lg.jp';
const EVENT_PAGE = `${SITE}/event/`;
const GEOJSON_PATH = path.join(
  repoRoot,
  'apps/web/public/data/geo/tokyo-municipalities.geojson',
);
const OUT_PATH = path.join(
  repoRoot,
  'apps/api/src/data/places/generated-kodomo-events.ts',
);

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function centroid(geometry) {
  let coords = [];
  if (geometry.type === 'Polygon') coords = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates[0][0];
  else return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const [lon, lat] of coords) {
    x += lon;
    y += lat;
    n += 1;
  }
  if (!n) return null;
  return { longitude: x / n, latitude: y / n };
}

function buildMunicipalityIndex(geojson) {
  const byName = new Map();
  for (const feature of geojson.features ?? []) {
    const name = feature.properties?.nameJa;
    if (!name) continue;
    const c = centroid(feature.geometry);
    if (!c) continue;
    byName.set(name, {
      code: String(feature.properties.code),
      longitude: c.longitude,
      latitude: c.latitude,
    });
  }
  return byName;
}

function resolveMunicipality(raw, index) {
  if (!raw) return null;
  const parts = raw
    .split(/[、,]/)
    .map((s) => s.split('（')[0].trim())
    .filter(Boolean);
  for (const part of parts) {
    const hit = index.get(part);
    if (hit) return hit;
  }
  return null;
}

function toEventPeriod(start, end) {
  if (!start) return undefined;
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = (end ?? start).split('-').map(Number);
  if (!sm || !sd || !em || !ed) return undefined;
  return { startMonth: sm, startDay: sd, endMonth: em, endDay: ed };
}

function slugId(title, start, link) {
  return `kodomo-event-${createHash('sha256')
    .update([title, start, link].filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 12)}`;
}

function absoluteUrl(src) {
  if (!src) return undefined;
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  return `${SITE}${src.startsWith('/') ? '' : '/'}${src}`;
}

async function main() {
  const html = await fetch(EVENT_PAGE, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });

  const geojson = JSON.parse(await readFile(GEOJSON_PATH, 'utf8'));
  const muniIndex = buildMunicipalityIndex(geojson);

  const cardRe =
    /<li([^>]*class="[^"]*c-column__type4--card is-clickable[^"]*"[^>]*)>([\s\S]*?)<\/li>/g;
  const places = [];
  const skipped = [];
  let m;
  while ((m = cardRe.exec(html))) {
    const attrs = m[1];
    const inner = m[2];

    const dataStart = (attrs.match(/data-start="([^"]*)"/) || [])[1];
    const dataEvent = (attrs.match(/data-event="([^"]*)"/) || [])[1];
    const dataCategory = (attrs.match(/data-category="([^"]*)"/) || [])[1] || '';
    const dataTargetAge = (attrs.match(/data-target-age="([^"]*)"/) || [])[1] || '';
    const dataMunicipalities =
      (attrs.match(/data-municipalities="([^"]*)"/) || [])[1] || '';

    const title = stripTags(
      (inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1] || '',
    );
    if (!title) continue;

    const linkMatch = inner.match(
      /<a[^>]*class="[^"]*c-column__type4--card--link[^"]*"[^>]*href="([^"]+)"/i,
    );
    const link = linkMatch ? linkMatch[1] : '';
    if (!link) continue;

    const description = stripTags(
      (inner.match(/<p class="c-text__level2">([\s\S]*?)<\/p>/i) || [])[1] || '',
    );
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/i);
    const imageUrl = imgMatch ? absoluteUrl(imgMatch[1]) : undefined;

    const details = {};
    const detailRe =
      /<p class="c-text__level3">([\s\S]*?)<\/p>\s*<p class="c-column__type4--card__information__text">([\s\S]*?)<\/p>/g;
    let d;
    while ((d = detailRe.exec(inner))) {
      details[stripTags(d[1])] = stripTags(d[2]);
    }
    const venue = details['場所'];
    const periodText = details['期間'];

    const muni = resolveMunicipality(dataMunicipalities, muniIndex);
    if (!muni) {
      skipped.push({ title, reason: 'no-resolvable-municipality', dataMunicipalities });
      continue;
    }

    const targetLower = dataTargetAge.toLowerCase();
    const strollerFriendly =
      targetLower.includes('未就学') || targetLower.includes('全年齢');
    const indoor =
      /室内|展望室|博物館|美術館|館$|ライブラリ|図書館/.test(
        `${venue ?? ''} ${title}`,
      );

    const eventPeriod = toEventPeriod(dataStart, dataEvent);
    const shortDescription = [
      description,
      periodText ? `期間: ${periodText}.` : '',
      venue ? `場所: ${venue}.` : '',
      '東京都子ども向けイベントポータルから収録。最新情報は公式サイトでご確認ください。',
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 280);

    const id = slugId(title, dataStart, link);
    const place = {
      id,
      name: title,
      category: 'event',
      latitude: Number(muni.latitude.toFixed(5)),
      longitude: Number(muni.longitude.toFixed(5)),
      eventPeriod,
      address: venue
        ? `${venue}（${dataMunicipalities.split(/[、,]/)[0].split('（')[0].trim()}）`
        : dataMunicipalities.split(/[、,]/)[0].split('（')[0].trim(),
      municipalityCode: muni.code,
      suitableAgeMinMonths: 0,
      suitableAgeMaxMonths: 216,
      indoorOutdoor: indoor ? 'indoor' : 'outdoor',
      strollerFriendly,
      tags: strollerFriendly ? ['stroller-friendly'] : [],
      shortDescription,
      media: imageUrl
        ? [
            {
              id: `${id}-cover`,
              type: 'image',
              url: imageUrl,
              alt: title,
              cover: true,
            },
          ]
        : [],
      websiteUrl: link,
      sourceUrl: link,
      sourceCheckedAt: new Date().toISOString(),
      status: 'published',
    };
    places.push(place);
  }

  const body = JSON.stringify(places, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"event"/g, "'event'")
    .replace(/"indoor"/g, "'indoor'")
    .replace(/"outdoor"/g, "'outdoor'")
    .replace(/"published"/g, "'published'")
    .replace(/"image"/g, "'image'")
    .replace(/"stroller-friendly"/g, "'stroller-friendly'");

  const fileContent = `import type { PlaceInput } from '@kodoko/domain';

// Generated by tools/tokyo-events/collect-kodomo-events.mjs.
// Source: ${EVENT_PAGE}
// Records all current "期間限定" event cards from the Tokyo Metropolitan children's
// event portal. Coordinates use the host municipality centroid (venue-level
// geocoding pending human review). Review generated diffs before merging.
export const kodomoEventPlaces: PlaceInput[] = ${body};
`;

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, fileContent, 'utf8');

  console.log(
    JSON.stringify(
      {
        generated: places.length,
        skipped: skipped.length,
        skippedSamples: skipped.slice(0, 10),
        outPath: OUT_PATH,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
