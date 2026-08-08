import { describe, expect, it } from 'vitest';
import { resolveRecommendationLocation } from './recommendationLocation';

describe('resolveRecommendationLocation', () => {
  it('prefers GPS coordinates over municipality fallback', () => {
    const gps = { latitude: 35.6812, longitude: 139.7671 };
    const result = resolveRecommendationLocation(gps, '13106');

    expect(result.source).toBe('gps');
    expect(result.point).toEqual(gps);
  });

  it('uses municipality centroid when GPS is unavailable', () => {
    const result = resolveRecommendationLocation(null, '13106');

    expect(result.source).toBe('municipality');
    expect(result.point?.latitude).toBeGreaterThan(35);
    expect(result.municipality?.code).toBe('13106');
  });

  it('returns unknown when neither GPS nor municipality is available', () => {
    const result = resolveRecommendationLocation(undefined, undefined);

    expect(result).toEqual({ source: 'unknown', point: undefined });
  });
});
