/**
 * Batched Wikipedia/Commons image fetch.
 * Uses up to 50 titles per API request (~15 requests total for 137 places)
 * instead of 2 requests per place, to stay well inside Wikimedia rate limits.
 *
 * Pass A: prop=pageimages  -> lead representative photo per place (becomes cover)
 * Pass B: prop=images      -> extra photos per place (best effort)
 * Pass C: prop=imageinfo   -> real URL + size + license + credit for candidate files
 *
 * Merges into scripts/media-generated.json (keeps previously found good results).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
const prev: Record<string, Entry> = existsSync(jsonUrl)
  ? JSON.parse(readFileSync(jsonUrl, 'utf8'))
  : {};

const UA = {
  'User-Agent': 'kodoko-media-collector/1.0 (parenting app seed data; batched, low-rate)',
};
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
const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

let requestCount = 0;
async function api(lang: 'ja' | 'en', params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  const url = `https://${lang}.wikipedia.org/w/api.php?${q.toString()}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    requestCount++;
    if (res.status === 429 || res.status === 503) {
      const wait = Math.min(60000, 5000 * 2 ** attempt);
      console.log(`   (429/503, cooling down ${wait / 1000}s)`);
      await sleep(wait);
      continue;
    }
    const txt = await res.text();
    if (!txt.startsWith('{')) {
      const wait = Math.min(60000, 5000 * 2 ** attempt);
      console.log(`   (non-JSON, cooling down ${wait / 1000}s)`);
      await sleep(wait);
      continue;
    }
    const j = JSON.parse(txt);
    if (j?.error?.code === 'maxlag') {
      await sleep(5000);
      continue;
    }
    await sleep(1500); // polite spacing between successful calls
    return j;
  }
  throw new Error('rate limited after retries');
}

/** wait until an "expensive" prop query succeeds */
async function waitForCooldown(lang: 'ja' | 'en') {
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'pageimages',
      piprop: 'name',
      titles: '東京タワー',
    });
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${q}`, { headers: UA });
    if (res.ok) {
      const t = await res.text();
      if (t.startsWith('{')) {
        console.log(`API ready (${lang}) after ${i} cooldown checks.`);
        return;
      }
    }
    console.log(`   cooling down... (${i + 1}) status=${res.status}`);
    await sleep(30000);
  }
  throw new Error('API never cooled down');
}

/** resolve original title -> final page title using normalized+redirects maps */
function buildTitleResolver(q: any) {
  const norm = new Map<string, string>();
  for (const n of q?.normalized ?? []) norm.set(n.from, n.to);
  const redir = new Map<string, string>();
  for (const r of q?.redirects ?? []) redir.set(r.from, r.to);
  return (orig: string) => {
    let t = norm.get(orig) ?? orig;
    t = redir.get(t) ?? t;
    return t;
  };
}

type PageInfo = { title: string; pageimage?: string; images: string[]; missing: boolean };

async function passPages(lang: 'ja' | 'en', names: string[]): Promise<Map<string, PageInfo>> {
  const result = new Map<string, PageInfo>();
  for (const group of chunk(names, 50)) {
    const j = await api(lang, {
      action: 'query',
      prop: 'pageimages|images',
      piprop: 'name',
      imlimit: 'max',
      redirects: '1',
      titles: group.join('|'),
    });
    const q = j?.query;
    if (!q) continue;
    const resolve = buildTitleResolver(q);
    const byTitle = new Map<string, any>();
    for (const p of q.pages ?? []) byTitle.set(p.title, p);
    for (const orig of group) {
      const p = byTitle.get(resolve(orig));
      if (!p) {
        result.set(orig, { title: orig, images: [], missing: true });
        continue;
      }
      result.set(orig, {
        title: p.title,
        pageimage: p.pageimage,
        images: (p.images ?? []).map((x: any) => x.title as string),
        missing: !!p.missing,
      });
    }
    console.log(`  pages batch done (${group.length} titles, req#${requestCount})`);
  }
  return result;
}

async function passImageInfo(lang: 'ja' | 'en', files: string[]) {
  const info = new Map<string, RealImage>();
  for (const group of chunk(files, 50)) {
    const j = await api(lang, {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata|mime',
      iiurlwidth: '1200',
      titles: group.join('|'),
    });
    for (const pg of j?.query?.pages ?? []) {
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
      info.set(pg.title, {
        url,
        credit: `${credit} / Wikimedia Commons`,
        license,
        sourceUrl: ii.descriptionurl || url,
        width: ii.thumbwidth || ii.width,
        height: ii.thumbheight || ii.height,
      });
    }
    console.log(`  imageinfo batch done (${group.length} files, req#${requestCount})`);
  }
  return info;
}

async function run(lang: 'ja' | 'en', places: typeof seedPlaces) {
  const names = places.map((p) => p.name);
  console.log(`\n=== ${lang}: resolving ${names.length} pages ===`);
  const pages = await passPages(lang, names);

  // collect candidate files
  const perPlace = new Map<string, string[]>();
  const allFiles = new Set<string>();
  for (const p of places) {
    const info = pages.get(p.name);
    if (!info || info.missing) continue;
    let cands = info.images.filter((t) => /\.(jpe?g|png)$/i.test(t) && !JUNK.test(t));
    if (info.pageimage) {
      const lead = cands.find((t) => t.replace(/^File:|^ファイル:/, '') === info.pageimage);
      if (lead) cands = [lead, ...cands.filter((t) => t !== lead)];
      else cands = [`File:${info.pageimage}`, ...cands];
    }
    cands = Array.from(new Set(cands)).slice(0, 6);
    perPlace.set(p.id, cands);
    cands.forEach((c) => allFiles.add(c));
  }
  console.log(`=== ${lang}: ${allFiles.size} candidate files ===`);
  const info = await passImageInfo(lang, Array.from(allFiles));

  const out = new Map<string, RealImage[]>();
  for (const p of places) {
    const cands = perPlace.get(p.id) ?? [];
    const imgs: RealImage[] = [];
    const seen = new Set<string>();
    for (const c of cands) {
      const ri = info.get(c);
      if (ri && !seen.has(ri.url)) {
        imgs.push(ri);
        seen.add(ri.url);
      }
      if (imgs.length >= 3) break;
    }
    if (imgs.length) out.set(p.id, imgs);
  }
  return { out, pages };
}

// ---- main ----
await waitForCooldown('ja');

const data: Record<string, Entry> = {};
for (const p of seedPlaces) data[p.id] = prev[p.id] ?? { wikiTitle: null, lang: null, real: [] };

const ja = await run('ja', seedPlaces);
for (const p of seedPlaces) {
  const imgs = ja.out.get(p.id);
  const pg = ja.pages.get(p.name);
  if (imgs && imgs.length > (data[p.id]?.real.length ?? 0)) {
    data[p.id] = { wikiTitle: pg?.title ?? p.name, lang: 'ja', real: imgs };
  } else if (pg && !pg.missing && !data[p.id].wikiTitle) {
    data[p.id].wikiTitle = pg.title;
    data[p.id].lang = 'ja';
  }
}

// English fallback only for places still without any real image
const stillEmpty = seedPlaces.filter((p) => (data[p.id]?.real.length ?? 0) === 0);
if (stillEmpty.length) {
  console.log(`\n${stillEmpty.length} places still empty -> trying en.wikipedia`);
  const en = await run('en', stillEmpty);
  for (const p of stillEmpty) {
    const imgs = en.out.get(p.id);
    if (imgs && imgs.length) {
      data[p.id] = { wikiTitle: en.pages.get(p.name)?.title ?? p.name, lang: 'en', real: imgs };
    }
  }
}

writeFileSync(jsonUrl, JSON.stringify(data, null, 2), 'utf8');
const withReal = Object.values(data).filter((v) => v.real.length > 0).length;
const totalImgs = Object.values(data).reduce((s, v) => s + v.real.length, 0);
console.log(
  `\nDONE. requests=${requestCount} placesWithReal=${withReal}/${seedPlaces.length} realImages=${totalImgs}`,
);
