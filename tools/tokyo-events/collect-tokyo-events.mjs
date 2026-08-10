import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'sources.json');

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function todayIsoDate(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hashId(parts) {
  return createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 16);
}

function candidateCategory(text) {
  if (/フリーマーケット| flea|蚤の市|バザー|リサイクル/i.test(text)) return 'flea-market';
  if (/子育て|育児|親子|こども|子ども|児童|乳幼児|赤ちゃん|キッズ/i.test(text)) return 'parenting';
  if (/祭|祭り|まつり|神輿|盆踊り|縁日/i.test(text)) return 'festival';
  if (/桜|花火|紅葉|イルミネーション|季節/i.test(text)) return 'seasonal';
  if (/ワークショップ|読み聞かせ|工作|体験|遊び/i.test(text)) return 'child-friendly';
  return 'general';
}

function confidenceFor(row, title, sourceUrl) {
  const text = Object.values(row).join(' ');
  const hasDate = /date|日|開始|終了|開催|start|end/i.test(Object.keys(row).join(' '));
  if (title && sourceUrl && hasDate) return 'high';
  if (title && sourceUrl) return 'medium';
  if (/開催|イベント|祭|子育て|親子|バザー/.test(text)) return 'medium';
  return 'low';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);

  const [headers = [], ...records] = rows.filter((r) => r.some((cell) => cell.trim()));
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), record[index]?.trim() ?? ''])),
  );
}

function firstValue(row, patterns) {
  for (const [key, value] of Object.entries(row)) {
    if (patterns.some((pattern) => pattern.test(key)) && value) return value;
  }
  return undefined;
}

function normalizeRow(row, source, fetchedAt) {
  const title = firstValue(row, [/名称/, /件名/, /タイトル/, /イベント名/, /^name$/i, /^title$/i]);
  const startsAt = firstValue(row, [/開始/, /開催日/, /年月日/, /^start/i, /from/i]);
  const endsAt = firstValue(row, [/終了/, /^end/i, /to/i]);
  const venueName = firstValue(row, [/場所/, /会場/, /施設/, /^venue/i]);
  const address = firstValue(row, [/住所/, /所在地/, /^address/i]);
  const sourceUrl =
    firstValue(row, [/url/i, /URL/, /リンク/, /詳細/]) ?? source.url ?? source.packageUrl;
  const text = Object.values(row).join(' ');
  const category = candidateCategory(`${title ?? ''} ${venueName ?? ''} ${text}`);

  if (!title || category === 'general') return undefined;

  return {
    id: `tokyo-event-${hashId([title, startsAt, venueName, sourceUrl])}`,
    title,
    category,
    startsAt,
    endsAt,
    venueName,
    address,
    sourceName: source.name,
    sourceUrl,
    fetchedAt,
    confidence: confidenceFor(row, title, sourceUrl),
    reviewNotes: [
      'Needs human review before publishing as public content.',
      source.format ? `Imported from ${source.format} resource.` : 'Imported from open data search.',
    ],
  };
}

function parseCandidateDate(value) {
  if (!value) return undefined;
  const normalized = String(value).replace(/[年月.]/g, '-').replace(/日/g, '').replace(/\//g, '-');
  const match = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function withinWindow(candidate, runDate, lookaheadDays) {
  const startsAt = parseCandidateDate(candidate.startsAt);
  if (!startsAt) return true;
  const start = new Date(`${runDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + lookaheadDays);
  return startsAt >= start && startsAt <= end;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, timeoutMs) {
  const response = await fetchWithTimeout(url, { headers: { accept: 'application/json' } }, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.json();
}

async function discoverCkanResources(config) {
  const resources = [];
  for (const query of config.ckan.queries) {
    const url = new URL(config.ckan.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('rows', '20');
    const payload = await fetchJson(url, config.requestTimeoutMs);
    const results = payload.result?.results ?? [];
    for (const dataset of results) {
      for (const resource of dataset.resources ?? []) {
        const format = String(resource.format ?? '').toUpperCase();
        if (!config.ckan.resourceFormats.includes(format)) continue;
        if (!resource.url) continue;
        resources.push({
          name: `${dataset.organization?.title ?? dataset.title ?? 'Tokyo open data'} / ${resource.name ?? format}`,
          url: resource.url,
          packageUrl: dataset.url ?? `https://catalog.data.metro.tokyo.lg.jp/dataset/${dataset.name}`,
          format,
        });
        if (resources.length >= config.maxResources) return resources;
      }
    }
  }
  return resources;
}

async function rowsFromResource(resource, config) {
  const response = await fetchWithTimeout(resource.url, {}, config.requestTimeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${resource.url}`);
  const text = await response.text();
  if (resource.format === 'JSON') {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json.slice(0, config.maxRowsPerResource);
    if (Array.isArray(json.data)) return json.data.slice(0, config.maxRowsPerResource);
    if (Array.isArray(json.result?.records)) return json.result.records.slice(0, config.maxRowsPerResource);
    return [];
  }
  return parseCsv(text).slice(0, config.maxRowsPerResource);
}

async function main() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const outputDir = path.resolve(getArg('output-dir', path.join(__dirname, 'out')));
  const fetchedAt = new Date().toISOString();
  const runDate = todayIsoDate(config.timezone);
  const errors = [];
  const byId = new Map();

  const resources = await discoverCkanResources(config);
  for (const resource of resources) {
    try {
      const rows = await rowsFromResource(resource, config);
      for (const row of rows) {
        const candidate = normalizeRow(row, resource, fetchedAt);
        if (candidate) byId.set(candidate.id, candidate);
      }
    } catch (error) {
      errors.push({ source: resource.url, message: error instanceof Error ? error.message : String(error) });
    }
  }

  const candidates = [...byId.values()]
    .filter((candidate) => withinWindow(candidate, runDate, config.lookaheadDays))
    .sort((a, b) =>
      `${a.startsAt ?? ''}${a.title}`.localeCompare(`${b.startsAt ?? ''}${b.title}`, 'ja'),
    );

  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${runDate}.tokyo-event-candidates.json`);
  await writeFile(
    outputPath,
    `${JSON.stringify({ runDate, fetchedAt, sourceCount: resources.length, candidates, errors }, null, 2)}\n`,
    'utf8',
  );

  console.log(JSON.stringify({ outputPath, sourceCount: resources.length, candidateCount: candidates.length, errorCount: errors.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
