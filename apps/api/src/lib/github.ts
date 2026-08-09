import { createHash } from 'node:crypto';
import type { Place, PlaceReportType } from '@kodoko/domain';

export type ReportIssueInput = {
  reportId: string;
  place: Place;
  placeId: string;
  type: PlaceReportType;
  detail?: string;
  createdAt: string;
};

export type ReportIssueResult =
  | {
      status: 'created';
      issueNumber: number;
      issueUrl: string;
      labelStatus: 'applied' | 'failed';
    }
  | { status: 'skipped'; reason: 'missing_config' | 'duplicate' }
  | { status: 'failed'; reason: string };

const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const recentIssueKeys = new Map<string, number>();

type GitHubIssueResponse = {
  number?: unknown;
  html_url?: unknown;
};

function getIssueConfig():
  | { token: string; repo: string; apiUrl: string }
  | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_ISSUE_REPO?.trim();
  if (!token || !repo) return null;
  return {
    token,
    repo,
    apiUrl: process.env.GITHUB_API_URL?.trim() || DEFAULT_GITHUB_API_URL,
  };
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function markdownInline(value: string): string {
  return compactWhitespace(value).replace(/[`[\]\\]/g, '\\$&');
}

function markdownCodeBlock(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

function normalizeDetail(detail: string | undefined): string {
  return compactWhitespace(detail ?? '').toLowerCase();
}

function issueKey(input: ReportIssueInput): string {
  return createHash('sha256')
    .update(`${input.placeId}\n${input.type}\n${normalizeDetail(input.detail)}`)
    .digest('hex');
}

function pruneIssueKeys(now: number) {
  for (const [key, createdAt] of recentIssueKeys) {
    if (now - createdAt >= DEDUPE_WINDOW_MS) recentIssueKeys.delete(key);
  }
}

function isDuplicateIssue(input: ReportIssueInput, now: number): boolean {
  pruneIssueKeys(now);
  const key = issueKey(input);
  return recentIssueKeys.has(key);
}

function rememberIssueKey(input: ReportIssueInput, now: number) {
  const key = issueKey(input);
  recentIssueKeys.set(key, now);
}

function issueTitle(input: ReportIssueInput): string {
  const placeName = input.place.nameZh ?? input.place.name;
  return truncate(`[場所回報] ${placeName} - ${input.type}`, 120);
}

function issueLabels(type: PlaceReportType): string[] {
  return ['report', `report:${type}`];
}

function labelColor(name: string): string {
  return name === 'report' ? 'fb923c' : 'fed7aa';
}

function labelDescription(name: string): string {
  return name === 'report'
    ? 'Public place correction report'
    : 'Public place correction report category';
}

function sourceLines(place: Place): string[] {
  const urls = [
    place.sourceUrl,
    place.websiteUrl,
    ...place.provenance.map((source) => source.url),
  ].filter((url): url is string => Boolean(url));
  const uniqueUrls = [...new Set(urls)];
  if (uniqueUrls.length === 0) return ['- No public source URL recorded.'];
  return uniqueUrls.map((url) => `- ${url}`);
}

function issueBody(input: ReportIssueInput): string {
  const detail = input.detail?.trim();
  return [
    '## Place report',
    '',
    `- Place: ${markdownInline(input.place.name)} (${markdownInline(input.placeId)})`,
    input.place.nameZh ? `- Chinese name: ${markdownInline(input.place.nameZh)}` : undefined,
    `- Report type: ${markdownInline(input.type)}`,
    `- API report id: ${markdownInline(input.reportId)}`,
    `- Submitted at: ${markdownInline(input.createdAt)}`,
    '',
    '## Report detail',
    '',
    detail ? markdownCodeBlock(truncate(detail, 2000)) : '_No detail provided._',
    '',
    '## Public source references',
    '',
    ...sourceLines(input.place),
    '',
    '## Review checklist',
    '',
    '- Verify against official or trusted public sources.',
    '- Update only public place data under `apps/api/src/data/places` when needed.',
    '- Do not add child, family, exact location, contact email, or private user data.',
    '- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before PR.',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

function parseGitHubIssueResponse(data: GitHubIssueResponse): {
  issueNumber: number;
  issueUrl: string;
} | null {
  if (typeof data.number !== 'number' || typeof data.html_url !== 'string') return null;
  return { issueNumber: data.number, issueUrl: data.html_url };
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'kodoko-report-issue',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function compactReason(value: string): string {
  return truncate(
    compactWhitespace(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
    120,
  );
}

async function githubFailureReason(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === 'string' && data.message.trim()) {
      return `github_http_${response.status}_${compactReason(data.message)}`;
    }
  } catch {
    // Fall through to plain HTTP status.
  }
  return `github_http_${response.status}`;
}

async function ensureLabel(config: { token: string; repo: string; apiUrl: string }, name: string): Promise<boolean> {
  const response = await fetch(`${config.apiUrl}/repos/${config.repo}/labels`, {
    method: 'POST',
    headers: githubHeaders(config.token),
    body: JSON.stringify({
      name,
      color: labelColor(name),
      description: labelDescription(name),
    }),
  });

  return response.ok || response.status === 422;
}

async function applyIssueLabels(
  config: { token: string; repo: string; apiUrl: string },
  issueNumber: number,
  labels: string[],
): Promise<'applied' | 'failed'> {
  const labelsReady = await Promise.all(labels.map((label) => ensureLabel(config, label)));
  if (labelsReady.some((ready) => !ready)) return 'failed';

  const response = await fetch(
    `${config.apiUrl}/repos/${config.repo}/issues/${issueNumber}/labels`,
    {
      method: 'POST',
      headers: githubHeaders(config.token),
      body: JSON.stringify({ labels }),
    },
  );
  return response.ok ? 'applied' : 'failed';
}

export function resetReportIssueState() {
  recentIssueKeys.clear();
}

export async function createReportIssue(input: ReportIssueInput): Promise<ReportIssueResult> {
  const config = getIssueConfig();
  if (!config) return { status: 'skipped', reason: 'missing_config' };

  const now = Date.now();
  if (isDuplicateIssue(input, now)) {
    return { status: 'skipped', reason: 'duplicate' };
  }

  try {
    const response = await fetch(`${config.apiUrl}/repos/${config.repo}/issues`, {
      method: 'POST',
      headers: githubHeaders(config.token),
      body: JSON.stringify({
        title: issueTitle(input),
        body: issueBody(input),
      }),
    });

    if (!response.ok) {
      return { status: 'failed', reason: await githubFailureReason(response) };
    }

    const parsed = parseGitHubIssueResponse((await response.json()) as GitHubIssueResponse);
    if (!parsed) return { status: 'failed', reason: 'invalid_github_response' };
    const labelStatus = await applyIssueLabels(config, parsed.issueNumber, issueLabels(input.type));
    rememberIssueKey(input, now);
    return { status: 'created', ...parsed, labelStatus };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}
