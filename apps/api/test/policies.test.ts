import { describe, expect, it } from 'vitest';
import type { PolicyRule } from '@kodoko/domain';
import { buildApp, API_PREFIX } from '../src/app';
import { seedPolicies } from '../src/data/policies';

function ruleMatchesAge(rule: PolicyRule, ageMonths: number): boolean {
  if ('all' in rule) return rule.all.every((child) => ruleMatchesAge(child, ageMonths));
  if ('any' in rule) return rule.any.some((child) => ruleMatchesAge(child, ageMonths));
  if (rule.field !== 'child.ageMonths') return true;
  if (rule.operator === 'gte') return ageMonths >= Number(rule.value);
  if (rule.operator === 'lte') return ageMonths <= Number(rule.value);
  return true;
}

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
    const housework = res.json().policies.find((p: { id: string }) => p.id === 'p-shibuya-housework-support');
    expect(housework?.municipalityCode).toBe('13113');
    expect(
      housework?.eligibilityRule.all.some((l: { field: string }) => l.field === 'user.municipalityCode'),
    ).toBe(true);
    await app.close();
  });

  it('uses specific official pages for municipality policy reminders', () => {
    const jaPolicies = seedPolicies.filter((p) => p.locale === 'ja');
    expect(jaPolicies.some((p) => p.id === 'p-diaper-support')).toBe(false);
    expect(jaPolicies.find((p) => p.id === 'p-medical-subsidy')?.officialUrl).toContain('kodomo_ij.html');
    expect(jaPolicies.find((p) => p.id === 'p-shibuya-housework-support')?.officialUrl).toContain(
      'kajisapota.html',
    );
    expect(jaPolicies.find((p) => p.id === 'p-weaning-class')?.officialUrl).toContain(
      'rinyushokukoshukai.html',
    );
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

  it('includes age-based vaccine, health-checkup, and childcare reminders', () => {
    const jaIds = new Set(seedPolicies.filter((p) => p.locale === 'ja').map((p) => p.id));
    for (const id of [
      'p-routine-vaccination-2-month-start',
      'p-routine-vaccination-1-year',
      'p-routine-vaccination-3-year-je',
      'p-routine-vaccination-school-entry-mr',
      'p-infant-health-checkups',
      'p-childcare-application-prep',
    ]) {
      expect(jaIds.has(id)).toBe(true);
    }
  });

  it('matches new vaccine reminders only in their target age windows', () => {
    const twoMonth = seedPolicies.find(
      (p) => p.id === 'p-routine-vaccination-2-month-start' && p.locale === 'ja',
    );
    const oneYear = seedPolicies.find(
      (p) => p.id === 'p-routine-vaccination-1-year' && p.locale === 'ja',
    );

    expect(twoMonth).toBeTruthy();
    expect(oneYear).toBeTruthy();
    expect(ruleMatchesAge(twoMonth!.eligibilityRule, 2)).toBe(true);
    expect(ruleMatchesAge(twoMonth!.eligibilityRule, 12)).toBe(false);
    expect(ruleMatchesAge(oneYear!.eligibilityRule, 12)).toBe(true);
    expect(ruleMatchesAge(oneYear!.eligibilityRule, 6)).toBe(false);
  });
});
