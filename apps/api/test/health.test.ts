import { describe, expect, it } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';

describe('GET /api/v1/health', () => {
  it('returns ok', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/health` });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });
});

describe('GET /api/v1/auth/session', () => {
  it('returns unauthenticated by default', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/auth/session` });
    expect(res.statusCode).toBe(200);
    expect(res.json().authenticated).toBe(false);
    await app.close();
  });
});

describe('auth endpoints are not implemented yet', () => {
  it('login returns 501 with structured error', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: `${API_PREFIX}/auth/login` });
    expect(res.statusCode).toBe(501);
    expect(res.json().error.code).toBe('NOT_IMPLEMENTED');
    await app.close();
  });
});