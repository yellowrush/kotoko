import { describe, expect, it } from 'vitest';
import type { ChildProfile, Place } from '@kodoko/domain';
import { recommendForChild, scorePlaceForChild } from './recommendations';

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: 'p1',
    name: 'P1',
    category: 'park',
    latitude: 35.7,
    longitude: 139.7,
    address: 'addr',
    municipalityCode: '13106',
    indoorOutdoor: 'outdoor',
    status: 'published',
    ...overrides,
  };
}

function makeChild(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: 'c1',
    displayName: 'Child',
    birthDate: '2023-01-15',
    interests: [],
    accessibilityNeeds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
    ...overrides,
  };
}

const TOKYO = { latitude: 35.6812, longitude: 139.7671 };
const NEAR = makePlace({ id: 'near', latitude: 35.682, longitude: 139.768 });
const FAR = makePlace({ id: 'far', latitude: 34.0, longitude: 139.0 });

describe('recommendForChild', () => {
  it('returns an empty list when there is no active child', () => {
    expect(recommendForChild({ child: undefined, places: [NEAR] })).toEqual([]);
  });

  it('keeps published in-range places and returns at most three', () => {
    const places = [1, 2, 3, 4].map((n) =>
      makePlace({ id: `p${n}`, latitude: 35.682, longitude: 139.768 + n * 0.002 }),
    );
    const result = recommendForChild({ child: makeChild(), places, userLocation: TOKYO });
    expect(result).toHaveLength(3);
    expect(result.some((r) => r.place.id === 'p4')).toBe(false);
  });

  it('excludes places beyond the default distance', () => {
    const result = recommendForChild({ child: makeChild(), places: [FAR, NEAR], userLocation: TOKYO });
    expect(result.map((r) => r.place.id)).toEqual(['near']);
  });

  it('sorts by score descending', () => {
    const indoor = makePlace({ id: 'in', indoorOutdoor: 'indoor', nursingRoom: true });
    const plain = makePlace({ id: 'plain' });
    const result = recommendForChild({
      child: makeChild(),
      places: [plain, indoor],
      userLocation: TOKYO,
      weather: { condition: 'rain' },
    });
    expect(result[0]?.place.id).toBe('in');
  });

  it('prefers indoor places on a rainy day', () => {
    const indoor = makePlace({ id: 'in', indoorOutdoor: 'indoor' });
    const outdoor = makePlace({ id: 'out', indoorOutdoor: 'outdoor' });
    const result = recommendForChild({
      child: makeChild(),
      places: [outdoor, indoor],
      userLocation: TOKYO,
      weather: { condition: 'rain' },
    });
    expect(result[0]?.place.id).toBe('in');
    expect(result[0]?.reasonCodes).toContain('weather');
  });

  it('boosts places matching the child interests', () => {
    const zoo = makePlace({ id: 'zoo', category: 'zoo' });
    const park = makePlace({ id: 'park', category: 'park' });
    const child = makeChild({ interests: ['zoo'] });
    const result = recommendForChild({ child, places: [park, zoo], userLocation: TOKYO });
    expect(result[0]?.place.id).toBe('zoo');
    expect(result[0]?.reasonCodes).toContain('interest');
  });

  it('deduplicates reason codes', () => {
    const place = makePlace({ strollerFriendly: true, suitableAgeMinMonths: 0 });
    const child = makeChild();
    const result = recommendForChild({ child, places: [place], userLocation: TOKYO });
    expect(result[0]?.reasonCodes).toEqual(['age_match', 'distance', 'facility']);
  });

  it('computes distance from the user location', () => {
    const result = recommendForChild({ child: makeChild(), places: [NEAR], userLocation: TOKYO });
    expect(result[0]?.distanceKm).toBeLessThan(1);
    expect(result[0]?.distanceKm).toBeGreaterThan(0);
  });

  it('leaves distance null when location is unknown', () => {
    const result = recommendForChild({ child: makeChild(), places: [NEAR] });
    expect(result[0]?.distanceKm).toBeNull();
  });
});

describe('transport and group pass-through', () => {
  const MID = makePlace({ id: 'mid', latitude: 35.7, longitude: 139.78 });

  it('applies walking distance, excluding places a child cannot walk to', () => {
    const result = recommendForChild({
      child: makeChild(),
      places: [MID],
      userLocation: TOKYO,
      transportMode: 'walking',
    });
    expect(result).toHaveLength(0);
  });

  it('includes the same place when travelling by car', () => {
    const result = recommendForChild({
      child: makeChild(),
      places: [MID],
      userLocation: TOKYO,
      transportMode: 'car',
    });
    expect(result.map((r) => r.place.id)).toEqual(['mid']);
  });

  it('ranks group-play places first for 3+ people', () => {
    const groupPlace = makePlace({ id: 'g', tags: ['group-play'] });
    const plain = makePlace({ id: 'p' });
    const result = recommendForChild({
      child: makeChild(),
      places: [groupPlace, plain],
      userLocation: TOKYO,
      groupSize: 3,
    });
    expect(result[0]?.place.id).toBe('g');
    expect(result[0]?.reasonCodes).toContain('group');
  });
});

describe('scorePlaceForChild', () => {
  it('returns undefined without an active child', () => {
    expect(scorePlaceForChild({ child: undefined, place: NEAR })).toBeUndefined();
  });

  it('scores a single place and explains reasons', () => {
    const rec = scorePlaceForChild({ child: makeChild(), place: NEAR });
    expect(rec).toBeDefined();
    expect(rec!.score).toBeGreaterThan(0);
    expect(rec!.reasons.length).toBeGreaterThan(0);
  });
});