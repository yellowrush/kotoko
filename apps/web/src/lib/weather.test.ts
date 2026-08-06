import { describe, expect, it } from 'vitest';
import { wmoToCondition } from './weather';

describe('wmoToCondition', () => {
  it('maps clear sky and cloud codes', () => {
    expect(wmoToCondition(0)).toBe('sunny');
    expect(wmoToCondition(1)).toBe('cloudy');
    expect(wmoToCondition(3)).toBe('cloudy');
    expect(wmoToCondition(45)).toBe('cloudy');
    expect(wmoToCondition(48)).toBe('cloudy');
  });

  it('maps rain, snow and storm codes', () => {
    expect(wmoToCondition(51)).toBe('rain');
    expect(wmoToCondition(61)).toBe('rain');
    expect(wmoToCondition(80)).toBe('rain');
    expect(wmoToCondition(71)).toBe('snow');
    expect(wmoToCondition(77)).toBe('snow');
    expect(wmoToCondition(85)).toBe('snow');
    expect(wmoToCondition(95)).toBe('storm');
    expect(wmoToCondition(99)).toBe('storm');
  });

  it('falls back to unknown for missing or unexpected codes', () => {
    expect(wmoToCondition(undefined)).toBe('unknown');
    expect(wmoToCondition(999)).toBe('unknown');
  });
});