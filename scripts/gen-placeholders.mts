/**
 * Generate deterministic per-category placeholder SVGs into
 * apps/web/public/media/placeholder/<category>-<n>.svg
 * These always resolve (served by web app), no copyright issue.
 * 3 variants per category cover 外観 / 内部 / 親子 viewpoints (plan §4).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const outDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../apps/web/public/media/placeholder',
);
mkdirSync(outDir, { recursive: true });

type Cat = { key: string; ja: string; emoji: string; h: number };
const cats: Cat[] = [
  { key: 'park', ja: '公園', emoji: '🌳', h: 140 },
  { key: 'playground', ja: '遊具広場', emoji: '🛝', h: 90 },
  { key: 'museum', ja: '博物館', emoji: '🏛️', h: 30 },
  { key: 'zoo', ja: '動物園', emoji: '🦒', h: 40 },
  { key: 'aquarium', ja: '水族館', emoji: '🐟', h: 200 },
  { key: 'library', ja: '図書館', emoji: '📚', h: 260 },
  { key: 'facility', ja: '施設', emoji: '🏢', h: 210 },
  { key: 'indoor-play', ja: '屋内あそび', emoji: '🧸', h: 20 },
  { key: 'shop', ja: 'ショップ', emoji: '🛍️', h: 320 },
  { key: 'restaurant', ja: 'レストラン', emoji: '🍽️', h: 15 },
  { key: 'event', ja: 'イベント広場', emoji: '🎪', h: 280 },
  { key: 'children-hall', ja: '児童館', emoji: '🏫', h: 50 },
  { key: 'toy-play', ja: 'おもちゃ美術館', emoji: '🪀', h: 350 },
  { key: 'amusement-park', ja: '遊園地', emoji: '🎢', h: 300 },
];

const views = ['外観・全景', '施設・内部', '親子・あそび'];

function svg(c: Cat, n: number): string {
  const light = 96 - (n - 1) * 6; // 96, 90, 84
  const bg1 = `hsl(${c.h} 70% ${light}%)`;
  const bg2 = `hsl(${(c.h + 25) % 360} 65% ${light - 8}%)`;
  const fg = `hsl(${c.h} 45% 32%)`;
  const view = views[(n - 1) % views.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="${c.ja} placeholder">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <g opacity="0.10" fill="${fg}">
    <circle cx="150" cy="120" r="80"/>
    <circle cx="1060" cy="700" r="120"/>
    <rect x="980" y="80" width="140" height="140" rx="24"/>
  </g>
  <text x="600" y="360" font-size="200" text-anchor="middle" dominant-baseline="central" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${c.emoji}</text>
  <text x="600" y="520" font-size="64" font-weight="700" text-anchor="middle" fill="${fg}" font-family="'Hiragino Sans','Yu Gothic',system-ui,sans-serif">${c.ja}</text>
  <text x="600" y="592" font-size="34" text-anchor="middle" fill="${fg}" opacity="0.85" font-family="'Hiragino Sans','Yu Gothic',system-ui,sans-serif">${view}</text>
  <text x="600" y="700" font-size="30" text-anchor="middle" fill="${fg}" opacity="0.7" font-family="'Hiragino Sans','Yu Gothic',system-ui,sans-serif">画像準備中 · Kodoko</text>
</svg>`;
}

let count = 0;
for (const c of cats) {
  for (let n = 1; n <= 3; n++) {
    writeFileSync(resolve(outDir, `${c.key}-${n}.svg`), svg(c, n), 'utf8');
    count++;
  }
}
console.log(`Generated ${count} placeholder SVGs into apps/web/public/media/placeholder/`);
