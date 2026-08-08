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
    media: [],
    labels: [],
    provenance: [],
    version: 1,
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

  it('uses max distance preferences when no transport mode is selected', () => {
    const result = recommendForChild({
      child: makeChild(),
      places: [FAR, NEAR],
      userLocation: TOKYO,
      maxDistanceKm: 3,
    });

    expect(result.map((r) => r.place.id)).toEqual(['near']);
  });

  it('passes indoor/outdoor preference into scoring', () => {
    const indoor = makePlace({ id: 'in', indoorOutdoor: 'indoor' });
    const outdoor = makePlace({ id: 'out', indoorOutdoor: 'outdoor' });
    const result = recommendForChild({
      child: makeChild(),
      places: [outdoor, indoor],
      indoorOutdoorPreference: 'indoor',
    });

    expect(result[0]?.place.id).toBe('in');
    expect(result[0]?.reasonCodes).toContain('indoor_outdoor');
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

  it('lets transport mode override a broader max distance preference', () => {
    const result = recommendForChild({
      child: makeChild(),
      places: [MID],
      userLocation: TOKYO,
      maxDistanceKm: 20,
      transportMode: 'walking',
    });
    expect(result).toHaveLength(0);
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

describe('recommendForChild with multiple children', () => {
  const toddler = makeChild({ id: 'toddler', birthDate: '2022-01-15' });
  const schooler = makeChild({ id: 'schooler', birthDate: '2017-01-15' });

  it('prefers places suitable for every selected child', () => {
    const broad = makePlace({ id: 'broad', suitableAgeMinMonths: 0, suitableAgeMaxMonths: 120 });
    const narrow = makePlace({ id: 'narrow', suitableAgeMinMonths: 24, suitableAgeMaxMonths: 36 });
    const result = recommendForChild({
      children: [toddler, schooler],
      places: [narrow, broad],
      userLocation: TOKYO,
    });
    expect(result[0]?.place.id).toBe('broad');
    expect(result[0]?.reasonCodes).toContain('age_match');
  });

  it('merges interests across all selected children', () => {
    const zoo = makePlace({ id: 'zoo', category: 'zoo' });
    const aquarium = makePlace({ id: 'aq', category: 'aquarium' });
    const park = makePlace({ id: 'park', category: 'park' });
    const childA = makeChild({ id: 'a', interests: ['zoo'] });
    const childB = makeChild({ id: 'b', interests: ['aquarium'] });
    const result = recommendForChild({
      children: [childA, childB],
      places: [park, zoo, aquarium],
      userLocation: TOKYO,
    });
    expect(result.slice(0, 2).map((r) => r.place.id)).toEqual(['zoo', 'aq']);
  });

  it('returns partial age match reason when only some children fit', () => {
    const narrow = makePlace({ id: 'narrow', suitableAgeMinMonths: 50, suitableAgeMaxMonths: 70 });
    const result = recommendForChild({
      children: [toddler, schooler],
      places: [narrow],
      userLocation: TOKYO,
    });
    expect(result[0]?.reasonCodes).toContain('age_partial');
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
