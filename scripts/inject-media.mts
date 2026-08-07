/**
 * Build final media[] per place (real images + placeholder top-up to >=3, exactly 1 cover)
 * and inject an inline `media: [...]` block after each place's `id:` line in the 9 data files.
 * Idempotent guard: skips a place if its object already contains a media block.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
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

const here = dirname(fileURLToPath(import.meta.url));
const gen: Record<string, Entry> = JSON.parse(
  readFileSync(resolve(here, 'media-generated.json'), 'utf8'),
);

const placesDir = resolve(here, '../apps/api/src/data/places');
const FILES = [
  'base.ts',
  'children-halls.ts',
  'toy-plays.ts',
  'amusement-parks.ts',
  'water-parks.ts',
  'tokyo-parks.ts',
  'train-museums.ts',
  'libraries-sports.ts',
  'supplements.ts',
];

const byId = new Map(seedPlaces.map((p) => [p.id, p]));
const views = ['外観・全景', '施設・内部', '親子・あそび'];

// single-quoted TS string with escaping
const q = (s: string) =>
  "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";

type MediaObj = {
  id: string;
  type: 'image';
  url: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl?: string;
  cover?: boolean;
};

function buildMedia(placeId: string): { media: MediaObj[]; real: number; ph: number } {
  const p = byId.get(placeId)!;
  const cat = p.category;
  const real = gen[placeId]?.real ?? [];
  const media: MediaObj[] = [];
  let n = 0;
  for (const r of real.slice(0, 3)) {
    n++;
    media.push({
      id: `${placeId}-${n}`,
      type: 'image',
      url: r.url,
      alt: `${p.name}｜${views[(n - 1) % 3]}`,
      credit: r.credit,
      license: r.license,
      sourceUrl: r.sourceUrl,
    });
  }
  const realCount = media.length;
  // top-up placeholders to reach 3
  for (let k = 1; media.length < 3; k++) {
    n++;
    media.push({
      id: `${placeId}-${n}`,
      type: 'image',
      url: `/media/placeholder/${cat}-${k}.svg`,
      alt: `${p.name}｜${views[(k - 1) % 3]}（画像準備中）`,
      credit: 'Kodoko プレースホルダー',
      license: 'placeholder',
    });
  }
  media[0].cover = true; // exactly one cover
  return { media, real: realCount, ph: media.length - realCount };
}

function emit(media: MediaObj[], baseIndent: string): string {
  const i2 = baseIndent + '  ';
  const i4 = baseIndent + '    ';
  const lines: string[] = [];
  lines.push(`${baseIndent}media: [`);
  for (const m of media) {
    lines.push(`${i2}{`);
    lines.push(`${i4}id: ${q(m.id)},`);
    lines.push(`${i4}type: 'image',`);
    lines.push(`${i4}url: ${q(m.url)},`);
    lines.push(`${i4}alt: ${q(m.alt)},`);
    lines.push(`${i4}credit: ${q(m.credit)},`);
    lines.push(`${i4}license: ${q(m.license)},`);
    if (m.sourceUrl) lines.push(`${i4}sourceUrl: ${q(m.sourceUrl)},`);
    if (m.cover) lines.push(`${i4}cover: true,`);
    lines.push(`${i2}},`);
  }
  lines.push(`${baseIndent}],`);
  return lines.join('\n');
}

let totalPlaces = 0;
let totalReal = 0;
let totalPh = 0;
const report: Record<string, { real: number; ph: number }> = {};

for (const file of FILES) {
  const path = resolve(placesDir, file);
  const src = readFileSync(path, 'utf8');
  const lines = src.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    const m = line.match(/^(\s*)id: '([^']+)',\s*$/);
    if (m) {
      const [, indent, id] = m;
      if (!byId.has(id)) continue; // safety
      // idempotency: if next ~40 lines already contain media: within this object, skip
      const lookahead = lines.slice(i + 1, i + 60).join('\n');
      const objEnd = lookahead.search(/^\s{0,4}\},/m);
      const objBody = objEnd >= 0 ? lookahead.slice(0, objEnd) : lookahead;
      if (/^\s*media:\s*\[/m.test(objBody)) {
        continue; // already has media
      }
      const { media, real, ph } = buildMedia(id);
      out.push(emit(media, indent));
      totalPlaces++;
      totalReal += real;
      totalPh += ph;
      report[id] = { real, ph };
    }
  }
  writeFileSync(path, out.join('\n'), 'utf8');
  console.log(`injected into ${file}`);
}

writeFileSync(resolve(here, 'inject-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(
  `\nInjected media into ${totalPlaces} places. images: real=${totalReal}, placeholder=${totalPh}, total=${totalReal + totalPh}`,
);
