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
  | { status: 'created'; issueNumber: number; issueUrl: string }
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
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'kodoko-report-issue',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: issueTitle(input),
        body: issueBody(input),
        labels: issueLabels(input.type),
      }),
    });

    if (!response.ok) {
      return { status: 'failed', reason: `github_http_${response.status}` };
    }

    const parsed = parseGitHubIssueResponse((await response.json()) as GitHubIssueResponse);
    if (!parsed) return { status: 'failed', reason: 'invalid_github_response' };
    rememberIssueKey(input, now);
    return { status: 'created', ...parsed };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}
