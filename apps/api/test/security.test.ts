import { afterEach, describe, expect, it } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';

const originalWebOrigin = process.env.WEB_ORIGIN;

afterEach(() => {
  if (originalWebOrigin === undefined) {
    delete process.env.WEB_ORIGIN;
  } else {
    process.env.WEB_ORIGIN = originalWebOrigin;
  }
});

describe('security defaults', () => {
  it('adds browser security headers to API responses', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/health` });

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBeTruthy();
    await app.close();
  });

  it('allows configured web origins with credentials', async () => {
    process.env.WEB_ORIGIN = 'https://app.example.test';
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/health`,
      headers: { origin: 'https://app.example.test' },
    });

    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.test');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    await app.close();
  });

  it('does not grant credentialed CORS to unknown origins', async () => {
    process.env.WEB_ORIGIN = 'https://app.example.test';
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/health`,
      headers: { origin: 'https://evil.example.test' },
    });

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    await app.close();
  });
});
