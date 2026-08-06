import { describe, expect, it } from 'vitest';
import { findMunicipality, findNearestMunicipality } from '../src/region';

describe('findMunicipality', () => {
  it('returns the municipality for a known code', () => {
    expect(findMunicipality('13113')?.nameJa).toBe('渋谷区');
  });

  it('returns undefined for unknown or missing code', () => {
    expect(findMunicipality('00000')).toBeUndefined();
    expect(findMunicipality(undefined)).toBeUndefined();
  });
});

describe('findNearestMunicipality', () => {
  it('matches a point inside a ward to that ward', () => {
    const nearest = findNearestMunicipality(35.6595, 139.7005);
    expect(nearest?.code).toBe('13113');
  });

  it('matches a point near a ward border to the closest ward', () => {
    const nearest = findNearestMunicipality(35.77, 139.76);
    expect(nearest?.code).toBe('13117');
  });

  it('always returns a municipality for coordinates in Tokyo', () => {
    expect(findNearestMunicipality(35.6812, 139.7671)).toBeDefined();
  });
});
