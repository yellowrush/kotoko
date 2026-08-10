import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'sources.json');

const CATEGORY_KEYWORDS = {
  'flea-market': [
    '\u30d5\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8',
    '\u86a4\u306e\u5e02',
    '\u30d0\u30b6\u30fc',
    '\u30ea\u30b5\u30a4\u30af\u30eb',
  ],
  parenting: [
    '\u5b50\u80b2\u3066',
    '\u80b2\u5150',
    '\u89aa\u5b50',
    '\u3053\u3069\u3082',
    '\u5b50\u3069\u3082',
    '\u5150\u7ae5',
    '\u4e73\u5e7c\u5150',
    '\u8d64\u3061\u3083\u3093',
    '\u30ad\u30c3\u30ba',
  ],
  festival: [
    '\u796d',
    '\u796d\u308a',
    '\u307e\u3064\u308a',
    '\u795e\u8f3f',
    '\u76c6\u8e0a\u308a',
    '\u7e01\u65e5',
  ],
  seasonal: [
    '\u685c',
    '\u82b1\u706b',
    '\u7d05\u8449',
    '\u30a4\u30eb\u30df\u30cd\u30fc\u30b7\u30e7\u30f3',
    '\u5b63\u7bc0',
  ],
  'child-friendly': [
    '\u30ef\u30fc\u30af\u30b7\u30e7\u30c3\u30d7',
    '\u8aad\u307f\u805e\u304b\u305b',
    '\u5de5\u4f5c',
    '\u4f53\u9a13',
    '\u904a\u3073',
  ],
};

const FIELD_KEYWORDS = {
  title: ['\u540d\u79f0', '\u4ef6\u540d', '\u30bf\u30a4\u30c8\u30eb', '\u30a4\u30d9\u30f3\u30c8\u540d'],
  startsAt: ['\u958b\u59cb', '\u958b\u50ac\u65e5', '\u5e74\u6708\u65e5'],
  endsAt: ['\u7d42\u4e86'],
  venueName: ['\u5834\u6240', '\u4f1a\u5834', '\u65bd\u8a2d'],
  address: ['\u4f4f\u6240', '\u6240\u5728\u5730'],
  sourceUrl: ['\u30ea\u30f3\u30af', '\u8a73\u7d30'],
};

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

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function candidateCategory(text) {
  const normalized = text.toLowerCase();
  if (includesAny(normalized, CATEGORY_KEYWORDS['flea-market']) || normalized.includes('flea')) {
    return 'flea-market';
  }
  if (includesAny(normalized, CATEGORY_KEYWORDS.parenting)) return 'parenting';
  if (includesAny(normalized, CATEGORY_KEYWORDS.festival)) return 'festival';
  if (includesAny(normalized, CATEGORY_KEYWORDS.seasonal)) return 'seasonal';
  if (includesAny(normalized, CATEGORY_KEYWORDS['child-friendly'])) return 'child-friendly';
  return 'general';
}

function confidenceFor(row, title, sourceUrl) {
  const text = Object.values(row).join(' ');
  const keys = Object.keys(row).join(' ');
  const hasDate =
    /date|start|end|from|to/i.test(keys) ||
    includesAny(keys, [
      '\u65e5',
      '\u958b\u59cb',
      '\u7d42\u4e86',
      '\u958b\u50ac',
    ]);
  if (title && sourceUrl && hasDate) return 'high';
  if (title && sourceUrl) return 'medium';
  if (
    includesAny(text, [
      '\u958b\u50ac',
      '\u30a4\u30d9\u30f3\u30c8',
      '\u796d',
      '\u5b50\u80b2\u3066',
      '\u89aa\u5b50',
      '\u30d0\u30b6\u30fc',
    ])
  ) {
    return 'medium';
  }
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

function firstValue(row, fieldName, englishPatterns = []) {
  const keywords = FIELD_KEYWORDS[fieldName] ?? [];
  for (const [key, value] of Object.entries(row)) {
    if (!value) continue;
    if (includesAny(key, keywords) || englishPatterns.some((pattern) => pattern.test(key))) {
      return value;
    }
  }
  return undefined;
}

function normalizeRow(row, source, fetchedAt) {
  const title = firstValue(row, 'title', [/^name$/i, /^title$/i]);
  const startsAt = firstValue(row, 'startsAt', [/^start/i, /from/i]);
  const endsAt = firstValue(row, 'endsAt', [/^end/i, /to/i]);
  const venueName = firstValue(row, 'venueName', [/^venue/i]);
  const address = firstValue(row, 'address', [/^address/i]);
  const sourceUrl =
    firstValue(row, 'sourceUrl', [/url/i]) ?? source.url ?? source.packageUrl;
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
  const normalized = String(value)
    .replace(/[\u5e74\u6708.]/g, '-')
    .replace(/\u65e5/g, '')
    .replace(/\//g, '-');
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
