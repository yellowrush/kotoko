import { describe, expect, it } from 'vitest';
import { countVisitsByPlaceId, getVisitMarkerTone } from './placeVisitMarkers';

describe('place visit marker helpers', () => {
  it.each([
    [0, 'none'],
    [1, 'low'],
    [2, 'low'],
    [3, 'medium'],
    [5, 'medium'],
    [6, 'high'],
  ] as const)('maps %i visits to the %s tone', (count, tone) => {
    expect(getVisitMarkerTone(count)).toBe(tone);
  });

  it('counts local visit records by place id', () => {
    expect(
      countVisitsByPlaceId([
        { placeId: 'p1' },
        { placeId: 'p2' },
        { placeId: 'p1' },
        { placeId: 'p1' },
      ]),
    ).toEqual({
      p1: 3,
      p2: 1,
    });
  });
});
