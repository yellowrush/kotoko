import { describe, expect, it, beforeEach } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';
import { resetReportState } from '../src/routes/reports';

describe('POST /api/v1/places/:placeId/reports', () => {
  beforeEach(() => resetReportState());
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