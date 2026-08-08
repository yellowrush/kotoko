import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';
import { resetReportState } from '../src/routes/reports';

describe('POST /api/v1/places/:placeId/reports', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetReportState();
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('accepts a valid report', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload: { type: 'business_hours', detail: '営業時間が変わりました' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('received');
    expect(body.id).toBeTruthy();
    expect(body.issue).toEqual({ status: 'skipped', reason: 'missing_config' });
    await app.close();
  });

  it('creates a GitHub issue when issue config is present', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_ISSUE_REPO = 'yellowrush/kotoko';

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ number: 42, html_url: 'https://github.com/yellowrush/kotoko/issues/42' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload: {
        type: 'address',
        detail: 'The public address shown on the page differs from the official site.',
        contactEmail: 'parent@example.com',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().issue).toEqual({
      status: 'created',
      issueNumber: 42,
      issueUrl: 'https://github.com/yellowrush/kotoko/issues/42',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = vi.mocked(fetchMock).mock.calls[0];
    expect(call?.[0]).toBe('https://api.github.com/repos/yellowrush/kotoko/issues');
    const init = call?.[1];
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body)) as {
      title: string;
      body: string;
      labels: string[];
    };
    expect(body.title).toContain('[場所回報]');
    expect(body.labels).toEqual(['report', 'report:address']);
    expect(body.body).toContain('ueno-park');
    expect(body.body).toContain('The public address shown on the page differs from the official site.');
    expect(body.body).not.toContain('parent@example.com');
    expect(body.body).not.toContain('127.0.0.1');
    await app.close();
  });

  it('keeps accepting reports when GitHub issue creation fails', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_ISSUE_REPO = 'yellowrush/kotoko';
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 400 })) as unknown as typeof fetch;

    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload: { type: 'media', detail: 'The image no longer matches this place.' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().issue).toEqual({ status: 'failed', reason: 'github_http_400' });
    await app.close();
  });

  it('deduplicates identical GitHub issues while still storing the report', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_ISSUE_REPO = 'yellowrush/kotoko';
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ number: 43, html_url: 'https://github.com/yellowrush/kotoko/issues/43' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const app = buildApp();
    const payload = { type: 'price', detail: 'Admission price has changed.' };
    const first = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload,
    });
    const duplicate = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(first.json().issue.status).toBe('created');
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().issue).toEqual({ status: 'skipped', reason: 'duplicate' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('validates the type against the allowed enum', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload: { type: 'not-a-real-type' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_BODY');
    await app.close();
  });

  it('returns 404 for an unknown place', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/does-not-exist/reports`,
      payload: { type: 'closed' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    await app.close();
  });

  it('rate-limits an IP after too many submissions', async () => {
    const app = buildApp();
    for (let i = 0; i < 5; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: `${API_PREFIX}/places/ueno-park/reports`,
        payload: { type: 'price', detail: `#${i}` },
      });
      expect(ok.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload: { type: 'price' },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('RATE_LIMITED');
    await app.close();
  });

  it('rejects a body with unknown extra fields (strict)', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/places/ueno-park/reports`,
      payload: { type: 'other', evil: 'x' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
