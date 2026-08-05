import { describe, expect, it } from 'vitest';
import { matchPolicy, isPolicyRule, childContext } from '../src/engine';
import type { PolicyRule } from '@kodoko/domain';

const AGE_LTE_216 = {
  all: [{ field: 'child.ageMonths', operator: 'lte', value: 216 }],
} satisfies PolicyRule;

describe('matchPolicy', () => {
  it('matches age lte rule', () => {
    const result = matchPolicy(AGE_LTE_216, { child: { ageMonths: 100 } });
    expect(result.matched).toBe(true);
  });

  it('does not match when age exceeds threshold', () => {
    const result = matchPolicy(AGE_LTE_216, { child: { ageMonths: 300 } });
    expect(result.matched).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('matches municipality and age combined with all', () => {
    const rule = {
      all: [
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
      ],
    } satisfies PolicyRule;

    expect(matchPolicy(rule, { child: { ageMonths: 24 }, user: { municipalityCode: '13108' } }).matched).toBe(true);
    expect(matchPolicy(rule, { child: { ageMonths: 24 }, user: { municipalityCode: '99999' } }).matched).toBe(false);
  });

  it('computes ageMonths from birthDate when not provided', () => {
    const rule = { all: [{ field: 'child.ageMonths', operator: 'lte', value: 12 }] } satisfies PolicyRule;
    const context = { child: { birthDate: '2024-01-15' }, today: '2025-01-15' };
    expect(matchPolicy(rule, context).matched).toBe(true);
  });

  it('supports in operator', () => {
    const rule = { all: [{ field: 'child.interests', operator: 'contains', value: '電車' }] } satisfies PolicyRule;
    expect(matchPolicy(rule, { child: { interests: ['電車', '恐竜'] } }).matched).toBe(true);
    expect(matchPolicy(rule, { child: { interests: ['恐竜'] } }).matched).toBe(false);
  });

  it('supports any groups', () => {
    const rule = {
      any: [
        { field: 'user.municipalityCode', operator: 'eq', value: '13101' },
        { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
      ],
    } satisfies PolicyRule;

    expect(matchPolicy(rule, { user: { municipalityCode: '13108' } }).matched).toBe(true);
    expect(matchPolicy(rule, { user: { municipalityCode: '00000' } }).matched).toBe(false);
  });

  it('returns explainable reasons', () => {
    const rule = {
      all: [
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
      ],
    } satisfies PolicyRule;

    const result = matchPolicy(rule, { child: { ageMonths: 24 }, user: { municipalityCode: '00000' } });
    expect(result.matched).toBe(false);
    expect(result.reasons.join(' ')).toContain('13108');
  });
});

describe('childContext', () => {
  it('derives age from birth date', () => {
    const ctx = childContext('2024-01-15');
    expect(ctx?.ageMonths).toBeGreaterThan(0);
    expect(ctx?.interests).toEqual([]);
  });
});

describe('isPolicyRule', () => {
  it('accepts valid rules', () => {
    expect(isPolicyRule(AGE_LTE_216)).toBe(true);
    expect(isPolicyRule({ any: [AGE_LTE_216] })).toBe(true);
  });

  it('rejects unknown operators and random objects', () => {
    expect(isPolicyRule({ field: 'a', operator: 'eval', value: 1 })).toBe(false);
    expect(isPolicyRule({ foo: 'bar' })).toBe(false);
    expect(isPolicyRule('all')).toBe(false);
  });
});