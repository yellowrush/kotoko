import { describe, expect, it } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';
import { seedPolicies } from '../src/data/policies';

describe('GET /api/v1/policies', () => {
  it('returns only published policies in the requested locale', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/policies?locale=ja` });
    const body = res.json();
    expect(res.statusCode).toBe(200);
    expect(body.total).toBeGreaterThan(0);
    expect(body.policies.every((p: { status: string; locale: string }) => p.status === 'published' && p.locale === 'ja')).toBe(true);
    await app.close();
  });

  it('returns a policy detail with eligibility rule', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/policies/p-child-allowance?locale=ja` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe('p-child-allowance');
    expect(body.eligibilityRule.all).toHaveLength(2);
    expect(body.authorityLevel).toBe('national');
    expect(body.officialUrl).toBeTruthy();
    await app.close();
  });

  it('falls back to ja when the requested locale is missing', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/policies/p-child-allowance?locale=fr` });
    expect(res.statusCode).toBe(200);
    expect(res.json().locale).toBe('ja');
    await app.close();
  });

  it('returns 404 with an unknown policy id', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/policies/nope?locale=ja` });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    await app.close();
  });

  it('exposes municipality codes for client-side filtering', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/policies?locale=ja` });
    const diaper = res.json().policies.find((p: { id: string }) => p.id === 'p-diaper-support');
    expect(diaper?.municipalityCode).toBe('13113');
    expect(
      diaper?.eligibilityRule.all.some((l: { field: string }) => l.field === 'user.municipalityCode'),
    ).toBe(true);
    await app.close();
  });

  it('serves the same ids in every supported locale', async () => {
    const ids: Record<string, Set<string>> = {};
    for (const p of seedPolicies) {
      const locales = ids[p.id] ?? new Set<string>();
      locales.add(p.locale);
      ids[p.id] = locales;
    }
    for (const locales of Object.values(ids)) {
      expect(locales.size).toBe(3);
    }
  });
});