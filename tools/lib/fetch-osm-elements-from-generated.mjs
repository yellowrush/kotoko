import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";

function parseArgs(argv) {
  const args = { batchSize: 100 };
  for (const arg of argv) {
    if (arg.startsWith("--input=")) args.input = arg.slice("--input=".length);
    if (arg.startsWith("--output="))
      args.output = arg.slice("--output=".length);
    if (arg.startsWith("--batch-size="))
      args.batchSize = Number.parseInt(arg.slice("--batch-size=".length), 10);
  }
  if (!args.input) throw new Error("--input is required");
  if (!args.output) throw new Error("--output is required");
  if (!Number.isInteger(args.batchSize) || args.batchSize <= 0) {
    throw new Error("--batch-size must be a positive integer");
  }
  return args;
}

function extractOsmRefs(source) {
  const refs = [];
  const seen = new Set();
  for (const match of source.matchAll(
    /https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/(\d+)/g,
  )) {
    const key = `${match[1]}/${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ type: match[1], id: match[2] });
  }
  return refs;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function queryForRefs(refs) {
  const idsByType = new Map([
    ["node", []],
    ["way", []],
    ["relation", []],
  ]);
  for (const ref of refs) {
    idsByType.get(ref.type)?.push(ref.id);
  }
  const clauses = [...idsByType.entries()]
    .filter(([, ids]) => ids.length > 0)
    .map(([type, ids]) => `  ${type}(id:${ids.join(",")});`)
    .join("\n");
  return `[out:json][timeout:60];\n(\n${clauses}\n);\nout center tags;`;
}

async function fetchBatch(refs, index, total) {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "User-Agent":
        "Kodoko data collection bot/0.1 (https://github.com/yellowrush/kotoko)",
    },
    body: new URLSearchParams({ data: queryForRefs(refs) }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(
      `batch ${index}/${total} failed: ${response.status} ${await response.text()}`,
    );
  }
  const payload = await response.json();
  return payload.elements ?? [];
}

const args = parseArgs(process.argv.slice(2));
const source = await readFile(args.input, "utf8");
const refs = extractOsmRefs(source);
const batches = chunk(refs, args.batchSize);
const elements = [];
const failed = [];

for (const [index, refsBatch] of batches.entries()) {
  try {
    const batchElements = await fetchBatch(
      refsBatch,
      index + 1,
      batches.length,
    );
    console.log(
      `Fetched ${batchElements.length}/${refsBatch.length} OSM elements in batch ${
        index + 1
      }/${batches.length}`,
    );
    elements.push(...batchElements);
  } catch (error) {
    failed.push(index + 1);
    console.warn(error instanceof Error ? error.message : String(error));
  }
}

await mkdir(dirname(args.output), { recursive: true });
await writeFile(args.output, JSON.stringify({ elements }, null, 2), "utf8");
console.log(`Wrote ${elements.length} OSM elements to ${args.output}`);
if (failed.length > 0) {
  console.warn(`Skipped ${failed.length} batches: ${failed.join(", ")}`);
}
