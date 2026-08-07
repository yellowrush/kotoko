/**
 * Re-fetch ONLY the places that currently have 0 real images, with robust
 * retry/backoff + maxlag, and merge into scripts/media-generated.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
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

const jsonUrl = new URL('./media-generated.json', import.meta.url);
const data: Record<string, Entry> = JSON.parse(readFileSync(jsonUrl, 'utf8'));

const UA = { 'User-Agent': 'kodoko-media-audit/1.0 (childcare app dev seed data; contact dev)' };
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

async function apiJson(lang: 'ja' | 'en', params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    maxlag: '5',
    ...params,
  });
  const url = `https://${lang}.wikipedia.org/w/api.php?${q.toString()}`;
  let lastErr: any;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 429 || res.status === 503) {
        const ra = Number(res.headers.get('retry-after')) || 0;
        await sleep(Math.max(ra * 1000, 1000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (j?.error?.code === 'maxlag') {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return j;
    } catch (e) {
      lastErr = e;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastErr ?? new Error('exhausted retries');
}

/** returns null ONLY if article explicitly missing; throws on repeated failure. */
async function fetchForTitle(lang: 'ja' | 'en', title: string): Promise<RealImage[] | null> {
  const page = await apiJson(lang, {
    action: 'query',
    prop: 'pageimages|images',
    piprop: 'name',
    imlimit: '100',
    redirects: '1',
    titles: title,
  });
  const p = page?.query?.pages?.[0];
  if (!p) throw new Error('no page object');
  if (p.missing) return null;

  const leadName: string | undefined = p.pageimage;
  const files: string[] = (p.images || []).map((x: any) => x.title as string);
  let candidates = files.filter((t) => /\.(jpe?g|png)$/i.test(t) && !JUNK.test(t));
  if (leadName) {
    const leadTitle = candidates.find((t) => t.replace(/^File:|^ファイル:/, '') === leadName);
    if (leadTitle) candidates = [leadTitle, ...candidates.filter((t) => t !== leadTitle)];
    else candidates = [`File:${leadName}`, ...candidates];
  }
  candidates = Array.from(new Set(candidates)).slice(0, 20);
  if (candidates.length === 0) return [];

  const info = await apiJson(lang, {
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1200',
    titles: candidates.join('|'),
  });
  const pages: any[] = info?.query?.pages || [];
  const order = new Map(candidates.map((t, i) => [t, i]));
  pages.sort((a, b) => (order.get(a.title) ?? 99) - (order.get(b.title) ?? 99));
  const out: RealImage[] = [];
  for (const pg of pages) {
    const ii = pg?.imageinfo?.[0];
    if (!ii) continue;
    const url = cleanUrl(ii.thumburl || ii.url);
    if (!/^https:\/\/upload\.wikimedia\.org\//.test(url)) continue;
    if (!/\.(jpe?g|png)$/i.test(url)) continue;
    if ((ii.width || 0) < 800 || (ii.height || 0) < 600) continue;
    const em = ii.extmetadata || {};
    const license =
      stripHtml(em.LicenseShortName?.value) ||
      (em.License?.value ? String(em.License.value).toUpperCase() : '') ||
      'Wikimedia Commons';
    let credit = stripHtml(em.Artist?.value) || stripHtml(em.Credit?.value) || 'Wikimedia Commons';
    if (credit.length > 120) credit = credit.slice(0, 117) + '…';
    out.push({
      url,
      credit: `${credit} / Wikimedia Commons`,
      license,
      sourceUrl: ii.descriptionurl || url,
      width: ii.thumbwidth || ii.width,
      height: ii.thumbheight || ii.height,
    });
    if (out.length >= 3) break;
  }
  return out;
}

const todo = seedPlaces.filter((p) => (data[p.id]?.real?.length ?? 0) === 0);
console.log(`Re-fetching ${todo.length} places with 0 real images...`);
let fixed = 0;
let done = 0;
for (const place of todo) {
  done++;
  const entry: Entry = { wikiTitle: null, lang: null, real: [] };
  for (const lang of ['ja', 'en'] as const) {
    let imgs: RealImage[] | null = null;
    try {
      imgs = await fetchForTitle(lang, place.name);
    } catch (e: any) {
      console.log(`   ! ${place.id} ${lang} error: ${e.message}`);
      continue;
    }
    if (imgs === null) continue; // missing in this lang
    entry.wikiTitle = place.name;
    entry.lang = lang;
    if (imgs.length > 0) {
      entry.real = imgs;
      break;
    }
    await sleep(200);
  }
  data[place.id] = entry;
  if (entry.real.length > 0) fixed++;
  console.log(
    `[${done}/${todo.length}] ${place.id} -> real:${entry.real.length} (${entry.lang ?? 'no-wiki'})`,
  );
  await sleep(400);
}

writeFileSync(jsonUrl, JSON.stringify(data, null, 2), 'utf8');
const totalReal = Object.values(data).filter((v) => v.real.length > 0).length;
console.log(`\nDONE retry. newly fixed=${fixed}. total withRealImages=${totalReal}/${seedPlaces.length}`);
