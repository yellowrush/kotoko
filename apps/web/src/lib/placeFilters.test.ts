import { describe, expect, it } from 'vitest';
import type { Place } from '@kodoko/domain';
import { filterPlaces, isAgeSuitable, formatDistanceKm } from './placeFilters';

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

const TOKYO = { latitude: 35.6812, longitude: 139.7671 };

describe('isAgeSuitable', () => {
  it('returns true when no age bounds', () => {
    const place = makePlace({});
    expect(isAgeSuitable(place, 60)).toBe(true);
  });

  it('respects min and max', () => {
    const place = makePlace({ suitableAgeMinMonths: 24, suitableAgeMaxMonths: 120 });
    expect(isAgeSuitable(place, 12)).toBe(false);
    expect(isAgeSuitable(place, 24)).toBe(true);
    expect(isAgeSuitable(place, 120)).toBe(true);
    expect(isAgeSuitable(place, 121)).toBe(false);
  });
});

describe('filterPlaces', () => {
  it('filters by category', () => {
    const place = makePlace({ category: 'zoo' });
    const result = filterPlaces([place], { category: 'park' });
    expect(result).toHaveLength(0);
  });

  it('filters by indoorOutdoor', () => {
    const result = filterPlaces([makePlace({})], { indoorOutdoor: 'indoor' });
    expect(result).toHaveLength(0);
  });

  it('filters by tags', () => {
    const dining = makePlace({ id: 'a', tags: ['dining'] });
    const plain = makePlace({ id: 'b' });
    const result = filterPlaces([plain, dining], { tags: ['dining'] });
    expect(result.map((p) => p.id)).toEqual(['a']);
  });

  it('excludes places beyond radius and computes distance', () => {
    const near = makePlace({ id: 'near', latitude: 35.682, longitude: 139.768 });
    const far = makePlace({ id: 'far', latitude: 34.0, longitude: 139.0 });
    const result = filterPlaces([far, near], { userLocation: TOKYO, radiusKm: 5 });
    expect(result.map((p) => p.id)).toEqual(['near']);
    expect(result[0]?.distanceKm).toBeLessThan(1);
  });

  it('sorts by distance ascending', () => {
    const a = makePlace({ id: 'a', latitude: 35.682, longitude: 139.768 });
    const b = makePlace({ id: 'b', latitude: 35.69, longitude: 139.79 });
    const result = filterPlaces([b, a], { userLocation: TOKYO, radiusKm: 10 });
    expect(result.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('sets ageSuitable flag', () => {
    const place = makePlace({ suitableAgeMinMonths: 24 });
    const result = filterPlaces([place], {}, 12);
    expect(result[0]?.ageSuitable).toBe(false);
  });

  it('filters by municipality when location mode is municipality', () => {
    const koto = makePlace({ id: 'koto', municipalityCode: '13108' });
    const shinagawa = makePlace({ id: 'shinagawa', municipalityCode: '13109' });
    const result = filterPlaces([shinagawa, koto], {
      locationMode: 'municipality',
      municipalityCode: '13108',
    });

    expect(result.map((p) => p.id)).toEqual(['koto']);
  });

  it('filters by rail line when location mode is rail', () => {
    const tozai = makePlace({
      id: 'tozai',
      transitAccess: [
        {
          operator: '東京メトロ',
          lineId: 'tokyo-metro-tozai',
          lineName: '東京メトロ東西線',
          stationName: '木場',
        },
      ],
    });
    const plain = makePlace({ id: 'plain' });
    const result = filterPlaces([plain, tozai], {
      locationMode: 'rail',
      railLineId: 'tokyo-metro-tozai',
    });

    expect(result.map((p) => p.id)).toEqual(['tozai']);
  });

  it('does not apply radius outside near mode', () => {
    const far = makePlace({ id: 'far', municipalityCode: '13108', latitude: 34.0, longitude: 139.0 });
    const result = filterPlaces([far], {
      locationMode: 'municipality',
      municipalityCode: '13108',
      userLocation: TOKYO,
      radiusKm: 1,
    });

    expect(result.map((p) => p.id)).toEqual(['far']);
  });
});

describe('formatDistanceKm', () => {
  it('formats meters and kilometres', () => {
    expect(formatDistanceKm(null)).toBe('--');
    expect(formatDistanceKm(0.5)).toBe('500m');
    expect(formatDistanceKm(2.345)).toBe('2.3km');
  });
});
