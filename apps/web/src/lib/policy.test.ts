import { describe, expect, it } from 'vitest';
import type { Policy } from '@kodoko/domain';
import { checkPolicyFor } from './policy';

function makePolicy(overrides: Partial<Policy> & { id: string }): Policy {
  return {
    title: overrides.id,
    authorityLevel: 'national',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 0 },
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
      ],
    },
    officialUrl: 'https://example.go.jp',
    sourceCheckedAt: '2026-01-10T00:00:00.000Z',
    version: 1,
    status: 'published',
    ...overrides,
  };
}

describe('checkPolicyFor', () => {
  it('matches a national policy for a young child', () => {
    const result = checkPolicyFor(makePolicy({ id: 'p1' }), { birthDate: '2024-01-15' });
    expect(result.matched).toBe(true);
    expect(result.failingLeaves).toEqual([]);
  });

  it('fails age conditions for an adult', () => {
    const result = checkPolicyFor(makePolicy({ id: 'p1' }), { birthDate: '1990-01-15' });
    expect(result.matched).toBe(false);
    expect(result.failingLeaves[0]?.field).toBe('child.ageMonths');
    expect(result.failingLeaves[0]?.actual).toBeGreaterThan(216);
  });

  it('requires the municipality code for ward-level policies', () => {
    const wardPolicy = makePolicy({
      id: 'p2',
      authorityLevel: 'municipality',
      municipalityCode: '13108',
      eligibilityRule: {
        all: [
          { field: 'child.ageMonths', operator: 'lte', value: 36 },
          { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
        ],
      },
    });

    const ok = checkPolicyFor(wardPolicy, { birthDate: '2024-01-15', municipalityCode: '13108' });
    expect(ok.matched).toBe(true);

    const wrongWard = checkPolicyFor(wardPolicy, {
      birthDate: '2024-01-15',
      municipalityCode: '13106',
    });
    expect(wrongWard.matched).toBe(false);
    expect(wrongWard.failingLeaves).toHaveLength(1);
    expect(wrongWard.failingLeaves[0]?.field).toBe('user.municipalityCode');

    const unknownWard = checkPolicyFor(wardPolicy, { birthDate: '2024-01-15' });
    expect(unknownWard.matched).toBe(false);
  });

  it('reports every failing leaf in an any group', () => {
    const anyPolicy = makePolicy({
      id: 'p3',
      eligibilityRule: {
        any: [
          { field: 'user.municipalityCode', operator: 'eq', value: '13101' },
          { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
        ],
      },
    });

    const result = checkPolicyFor(anyPolicy, { municipalityCode: '00000' });
    expect(result.matched).toBe(false);
    expect(result.failingLeaves).toHaveLength(2);
  });
});