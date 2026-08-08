import { describe, expect, it } from 'vitest';
import type { Place } from '@kodoko/domain';
import { recommendPlaces, scorePlace, haversineDistanceKm } from '../src/scoring';
import type { RecommendationInput } from '../src/scoring';

const place = (overrides: Partial<Place> = {}): Place => ({
  id: 'p1',
  name: 'Park',
  category: 'park',
  latitude: 35.681,
  longitude: 139.767,
  address: 'Tokyo',
  municipalityCode: '13101',
  indoorOutdoor: 'outdoor',
  status: 'published',
  ...overrides,
});

const baseInput = (overrides: Partial<RecommendationInput> = {}): RecommendationInput => ({
  childAgeMonths: 24,
  interests: [],
  accessibilityNeeds: [],
  places: [],
  ...overrides,
});

describe('haversineDistanceKm', () => {
  it('returns 0 for the same point', () => {
    const p = { latitude: 35.681, longitude: 139.767 };
    expect(haversineDistanceKm(p, p)).toBe(0);
  });

  it('computes Tokyo to Osaka roughly correctly', () => {
    const d = haversineDistanceKm({ latitude: 35.681, longitude: 139.767 }, { latitude: 34.6937, longitude: 135.5023 });
    expect(d).toBeGreaterThan(380);
    expect(d).toBeLessThan(410);
  });
});

describe('scorePlace', () => {
  it('scores zero for non-published places', () => {
    const r = scorePlace(place({ status: 'draft' }), baseInput());
    expect(r.score).toBe(0);
  });

  it('age match yields a positive score', () => {
    const r = scorePlace(place({ suitableAgeMinMonths: 12, suitableAgeMaxMonths: 36 }), baseInput({ childAgeMonths: 24 }));
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.some((x) => x.code === 'age_match')).toBe(true);
  });

  it('age mismatch is heavily penalized', () => {
    const r = scorePlace(place({ suitableAgeMinMonths: 60, suitableAgeMaxMonths: 120 }), baseInput({ childAgeMonths: 6 }));
    const matched = scorePlace(place({ suitableAgeMinMonths: 60, suitableAgeMaxMonths: 120 }), baseInput({ childAgeMonths: 72 }));
    expect(r.score).toBeLessThan(matched.score);
  });

  it('rain pushes indoor places above outdoor ones', () => {
    const indoor = place({ id: 'in', indoorOutdoor: 'indoor' });
    const outdoor = place({ id: 'out', indoorOutdoor: 'outdoor' });
    const input = baseInput({ weather: { condition: 'rain' } });
    const rIn = scorePlace(indoor, input);
    const rOut = scorePlace(outdoor, input);
    expect(rIn.score).toBeGreaterThan(rOut.score);
    expect(rIn.reasons.some((x) => x.code === 'weather')).toBe(true);
  });

  it('facilities add score', () => {
    const basic = scorePlace(place(), baseInput());
    const equipped = scorePlace(
      place({ strollerFriendly: true, nursingRoom: true, diaperChanging: true }),
      baseInput(),
    );
    expect(equipped.score).toBeGreaterThan(basic.score);
  });

  it('interest match adds score', () => {
    const park = place({ category: 'park' });
    const noInterest = scorePlace(park, baseInput({ interests: [] }));
    const withInterest = scorePlace(park, baseInput({ interests: ['park'] }));
    expect(withInterest.score).toBeGreaterThan(noInterest.score);
  });

  it('places beyond max distance are filtered out', () => {
    const far = place({ latitude: 40.0, longitude: 139.0 });
    const input = baseInput({
      userLocation: { latitude: 35.681, longitude: 139.767 },
      maxDistanceKm: 5,
    });
    const r = scorePlace(far, input);
    expect(r.score).toBe(0);
  });

  it('applies a walking-mode max distance of 2 km', () => {
    const mid = place({ latitude: 35.7, longitude: 139.78 });
    const input = baseInput({
      userLocation: { latitude: 35.681, longitude: 139.767 },
      transportMode: 'walking',
    });
    expect(scorePlace(mid, input).score).toBe(0);
  });

  it('allows the same place when travelling by car', () => {
    const mid = place({ latitude: 35.7, longitude: 139.78 });
    const input = baseInput({
      userLocation: { latitude: 35.681, longitude: 139.767 },
      transportMode: 'car',
    });
    expect(scorePlace(mid, input).score).toBeGreaterThan(0);
  });

  it('uses transport distance before an explicit distance preference', () => {
    const mid = place({ latitude: 35.7, longitude: 139.78 });
    const input = baseInput({
      userLocation: { latitude: 35.681, longitude: 139.767 },
      maxDistanceKm: 20,
      transportMode: 'walking',
    });
    expect(scorePlace(mid, input).score).toBe(0);
  });

  it('applies indoor and outdoor preferences', () => {
    const indoor = place({ id: 'in', indoorOutdoor: 'indoor' });
    const outdoor = place({ id: 'out', indoorOutdoor: 'outdoor' });
    const input = baseInput({ indoorOutdoorPreference: 'indoor' });

    expect(scorePlace(indoor, input).score).toBeGreaterThan(scorePlace(outdoor, input).score);
    expect(scorePlace(indoor, input).reasons.some((x) => x.code === 'indoor_outdoor')).toBe(true);
  });

  it('keeps municipality fallback outside the recommendation package', () => {
    const result = scorePlace(place(), baseInput());

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((x) => x.code === 'distance')).toBe(false);
  });

  it('boosts group-play places when 3+ people go together', () => {
    const groupPlace = place({ id: 'g', tags: ['group-play'] });
    const plain = place({ id: 'p' });
    const input = baseInput({ groupSize: 3 });
    const rGroup = scorePlace(groupPlace, input);
    const rPlain = scorePlace(plain, input);
    expect(rGroup.score).toBeGreaterThan(rPlain.score);
    expect(rGroup.reasons.some((x) => x.code === 'group')).toBe(true);
  });

  it('does not boost group-play places for small or unknown groups', () => {
    const groupPlace = place({ tags: ['group-play'] });
    expect(scorePlace(groupPlace, baseInput({ groupSize: 2 })).reasons.some((x) => x.code === 'group')).toBe(false);
    expect(scorePlace(groupPlace, baseInput()).reasons.some((x) => x.code === 'group')).toBe(false);
  });
});

describe('recommendPlaces', () => {
  it('ranks and excludes zeros', () => {
    const list = [
      place({ id: 'a', category: 'park', suitableAgeMinMonths: 12, suitableAgeMaxMonths: 36 }),
      place({ id: 'b', category: 'museum', suitableAgeMinMonths: 12, suitableAgeMaxMonths: 36 }),
      place({ id: 'c', status: 'draft' }),
    ];
    const results = recommendPlaces(baseInput({ childAgeMonths: 24, interests: ['park'], places: list }));
    expect(results).toHaveLength(2);
    expect(results[0]?.place.id).toBe('a');
    expect(results[1]?.place.id).toBe('b');
  });
});
