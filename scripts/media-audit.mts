import { writeFileSync } from 'node:fs';
import { seedPlaces } from '../apps/api/src/data/places/index';

type Row = {
  id: string;
  name: string;
  category: string;
  imageCount: number;
  videoCount: number;
  realCount: number;
  placeholderCount: number;
  coverCount: number;
  ok: boolean;
  issues: string[];
};

const isPlaceholder = (url: string) => url.startsWith('/media/placeholder/');

const rows: Row[] = seedPlaces.map((p) => {
  const images = p.media.filter((m) => m.type === 'image');
  const videos = p.media.filter((m) => m.type === 'video');
  const covers = p.media.filter((m) => m.cover === true);
  const real = images.filter((m) => !isPlaceholder(m.url));
  const ph = images.filter((m) => isPlaceholder(m.url));
  const issues: string[] = [];
  if (images.length < 3) issues.push(`only ${images.length} images (<3)`);
  if (covers.length !== 1) issues.push(`cover=${covers.length} (want 1)`);
  for (const m of p.media) {
    if (!m.credit && !m.sourceUrl) issues.push(`media ${m.id} has no credit/sourceUrl`);
    if (!m.alt) issues.push(`media ${m.id} missing alt`);
  }
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    imageCount: images.length,
    videoCount: videos.length,
    realCount: real.length,
    placeholderCount: ph.length,
    coverCount: covers.length,
    ok: issues.length === 0,
    issues,
  };
});

const total = rows.length;
const complete = rows.filter((r) => r.ok);
const missing = rows.filter((r) => !r.ok);
const withReal = rows.filter((r) => r.realCount > 0);
const fullyReal = rows.filter((r) => r.realCount >= 3);
const totalRealImgs = rows.reduce((s, r) => s + r.realCount, 0);
const totalPhImgs = rows.reduce((s, r) => s + r.placeholderCount, 0);

const byCat: Record<string, { n: number; real: number }> = {};
for (const r of rows) {
  byCat[r.category] ??= { n: 0, real: 0 };
  byCat[r.category].n++;
  if (r.realCount > 0) byCat[r.category].real++;
}

console.log('=== TOTAL PLACES:', total, '===');
console.log('DoD-complete (>=3 img, exactly 1 cover, credit+alt):', complete.length);
console.log('Incomplete:', missing.length);
console.log('Places with >=1 real image:', withReal.length);
console.log('Places fully real (>=3 real):', fullyReal.length);
console.log(`Total images: real=${totalRealImgs}, placeholder=${totalPhImgs}, all=${totalRealImgs + totalPhImgs}`);
console.log('\n=== BY CATEGORY (real-covered / total) ===');
for (const [c, v] of Object.entries(byCat).sort()) console.log(`${c}: ${v.real}/${v.n}`);

if (missing.length) {
  console.log('\n=== INCOMPLETE (issues) ===');
  for (const r of missing) console.log(`${r.id}: ${r.issues.join('; ')}`);
}

writeFileSync(
  new URL('./media-audit.json', import.meta.url),
  JSON.stringify(rows, null, 2),
  'utf8',
);
console.log('\nWrote scripts/media-audit.json');
