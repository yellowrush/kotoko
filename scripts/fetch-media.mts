/**
 * Fetch real, open-licensed photos for each place from Wikipedia (ja, fallback en).
 * Only upload.wikimedia.org (Commons) URLs are used — hotlink-safe, stable, licensed.
 * Output: scripts/media-generated.json  (placeId -> { wikiTitle, lang, real: RealImage[] })
 */
import { writeFileSync } from 'node:fs';
import { seedPlaces } from '../apps/api/src/data/places/index';

type RealImage = {
  url: string;
  credit: string;
  license: string;
  sourceUrl: string;
  width: number;
  height: number;
};
type Entry = { wikiTitle: string | null; lang: 'ja' | 'en' | null; real: RealImage[] };

const UA = { 'User-Agent': 'kodoko-media-audit/1.0 (childcare app dev seed data)' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const JUNK =
  /(logo|icon|commons-|wikidata|wiktionary|_map|map_|locator|osm|ambox|symbol|flag|coat[_ ]?of[_ ]?arms|紋章|地図|位置|所在地|edit-|question|disambig|portal|crystal|nuvola|emblem|seal[_ ]|pictogram|\.svg$|\.gif$|\.webp$|\.tif$|\.tiff$)/i;

const stripHtml = (s: string) =>
  (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const cleanUrl = (u: string) => u.split('?')[0];

async function apiJson(lang: 'ja' | 'en', params: Record<string, string>) {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const url = `https://${lang}.wikipedia.org/w/api.php?${q.toString()}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as any;
}

async function fetchForTitle(lang: 'ja' | 'en', title: string): Promise<RealImage[] | null> {
  // 1) page: lead pageimage name + list of image file titles
  const page = await apiJson(lang, {
    action: 'query',
    prop: 'pageimages|images',
    piprop: 'name',
    imlimit: '80',
    redirects: '1',
    titles: title,
  });
  const p = page?.query?.pages?.[0];
  if (!p || p.missing) return null;

  const leadName: string | undefined = p.pageimage; // e.g. "Ueno_Zoo_...jpg"
  const files: string[] = (p.images || []).map((x: any) => x.title as string);

  // pre-filter by extension + junk
  let candidates = files.filter((t) => /\.(jpe?g|png)$/i.test(t) && !JUNK.test(t));
  // prioritise lead image
  if (leadName) {
    const leadTitle = candidates.find((t) => t.replace(/^File:|^ファイル:/, '') === leadName);
    if (leadTitle) candidates = [leadTitle, ...candidates.filter((t) => t !== leadTitle)];
    else candidates = [`File:${leadName}`, ...candidates];
  }
  candidates = Array.from(new Set(candidates)).slice(0, 18);
  if (candidates.length === 0) return [];

  // 2) imageinfo for candidates
  const info = await apiJson(lang, {
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1200',
    titles: candidates.join('|'),
  });
  const pages: any[] = info?.query?.pages || [];
  const out: RealImage[] = [];
  // keep candidate order
  const order = new Map(candidates.map((t, i) => [t, i]));
  pages.sort((a, b) => (order.get(a.title) ?? 99) - (order.get(b.title) ?? 99));
  for (const pg of pages) {
    const ii = pg?.imageinfo?.[0];
    if (!ii) continue;
    const url: string = cleanUrl(ii.thumburl || ii.url);
    if (!/^https:\/\/upload\.wikimedia\.org\//.test(url)) continue;
    if (!/\.(jpe?g|png)$/i.test(url)) continue;
    const w = ii.thumbwidth || ii.width || 0;
    const h = ii.thumbheight || ii.height || 0;
    // require >= 800x600 (use original size for gate to avoid tiny source images)
    if ((ii.width || 0) < 800 || (ii.height || 0) < 600) continue;
    const em = ii.extmetadata || {};
    const license =
      stripHtml(em.LicenseShortName?.value) ||
      (em.License?.value ? String(em.License.value).toUpperCase() : '') ||
      'Wikimedia Commons';
    let credit = stripHtml(em.Artist?.value);
    if (!credit) credit = stripHtml(em.Credit?.value);
    if (!credit) credit = 'Wikimedia Commons';
    if (credit.length > 120) credit = credit.slice(0, 117) + '…';
    out.push({
      url,
      credit: `${credit} / Wikimedia Commons`,
      license,
      sourceUrl: ii.descriptionurl || url,
      width: w,
      height: h,
    });
    if (out.length >= 3) break;
  }
  return out;
}

const result: Record<string, Entry> = {};
let realHits = 0;
let idx = 0;
for (const place of seedPlaces) {
  idx++;
  const entry: Entry = { wikiTitle: null, lang: null, real: [] };
  for (const lang of ['ja', 'en'] as const) {
    try {
      const imgs = await fetchForTitle(lang, place.name);
      if (imgs === null) continue; // article missing in this lang
      entry.wikiTitle = place.name;
      entry.lang = lang;
      if (imgs.length > 0) {
        entry.real = imgs;
        break;
      }
      // article exists but no usable images -> try other lang too
    } catch (e: any) {
      // ignore, try next lang
    }
    await sleep(120);
  }
  if (entry.real.length > 0) realHits++;
  result[place.id] = entry;
  console.log(
    `[${idx}/${seedPlaces.length}] ${place.id} -> real:${entry.real.length} (${entry.lang ?? 'no-wiki'})`,
  );
  await sleep(150);
}

writeFileSync(
  new URL('./media-generated.json', import.meta.url),
  JSON.stringify(result, null, 2),
  'utf8',
);
console.log(`\nDONE. places=${seedPlaces.length} withRealImages=${realHits}`);
