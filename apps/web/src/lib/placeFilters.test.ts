import type { Place } from '@kodoko/domain';
import { describe, expect, it } from 'vitest';
import { filterPlaces, isEventInSeason, matchesPlaceQuery } from './placeFilters';

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: 'place',
    name: 'Place',
    category: 'event',
    latitude: 35.68,
    longitude: 139.76,
    address: 'Tokyo',
    municipalityCode: '13101',
    indoorOutdoor: 'outdoor',
    status: 'published',
    media: [],
    labels: [],
    provenance: [],
    version: 1,
    ...overrides,
  };
}

const sakuraMatsuri = makePlace({
  id: 'bokutei-sakura-matsuri',
  name: '墨堤さくらまつり',
  eventPeriod: { startMonth: 3, startDay: 15, endMonth: 4, endDay: 10 },
});

describe('isEventInSeason', () => {
  it('shows events while their window is active', () => {
    expect(isEventInSeason(sakuraMatsuri, new Date(2027, 3, 1))).toBe(true);
  });

  it('hides events whose season already ended', () => {
    expect(isEventInSeason(sakuraMatsuri, new Date(2026, 7, 10))).toBe(false);
  });

  it('shows upcoming events within the lookahead window', () => {
    const hanabi = makePlace({
      id: 'sumidagawa-hanabi',
      name: '隅田川花火大会',
      eventPeriod: { startMonth: 7, startDay: 21, endMonth: 7, endDay: 31 },
    });
    expect(isEventInSeason(hanabi, new Date(2026, 4, 1))).toBe(true);
  });

  it('hides events whose next occurrence is beyond the lookahead window', () => {
    expect(isEventInSeason(sakuraMatsuri, new Date(2026, 7, 10))).toBe(false);
  });

  it('handles windows crossing year boundary', () => {
    const newYearEvent = makePlace({
      id: 'oshoogatsu-kodomo',
      name: 'お正月こどもイベント',
      eventPeriod: { startMonth: 12, startDay: 25, endMonth: 1, endDay: 5 },
    });
    expect(isEventInSeason(newYearEvent, new Date(2026, 11, 28))).toBe(true);
    expect(isEventInSeason(newYearEvent, new Date(2026, 0, 3))).toBe(true);
    expect(isEventInSeason(newYearEvent, new Date(2026, 4, 10))).toBe(false);
  });

  it('keeps events without eventPeriod visible', () => {
    const plaza = makePlace({ id: 'event-plaza', category: 'event' });
    expect(isEventInSeason(plaza, new Date(2026, 7, 10))).toBe(true);
  });

  it('keeps non-event places visible', () => {
    const park = makePlace({ id: 'ueno-park', category: 'park' });
    expect(isEventInSeason(park, new Date(2026, 7, 10))).toBe(true);
  });
});

describe('filterPlaces event season filtering', () => {
  it('excludes out-of-season events unless the current season matches', () => {
    const ueno = makePlace({ id: 'ueno-park', category: 'park' });
    const filtered = filterPlaces(
      [sakuraMatsuri, ueno],
      { referenceDate: '2026-08-10' },
    );
    expect(filtered.map((p) => p.id)).toEqual(['ueno-park']);
  });

  it('includes in-season and upcoming events', () => {
    const suwa = makePlace({
      id: 'suwa-jinja-reitaisai-higashimurayama',
      name: '諏訪神社例大祭',
      eventPeriod: { startMonth: 8, startDay: 26, endMonth: 8, endDay: 27 },
    });
    const jizo = makePlace({
      id: 'jizo-matsuri-higashimurayama',
      name: '地蔵まつり',
      eventPeriod: { startMonth: 11, startDay: 3, endMonth: 11, endDay: 3 },
    });
    const filtered = filterPlaces(
      [sakuraMatsuri, suwa, jizo],
      { referenceDate: '2026-08-10' },
    );
    expect(filtered.map((p) => p.id).sort()).toEqual([
      'jizo-matsuri-higashimurayama',
      'suwa-jinja-reitaisai-higashimurayama',
    ]);
  });
});

describe('matchesPlaceQuery', () => {
  const ueno = makePlace({
    id: 'ueno-park',
    category: 'park',
    name: '上野恩賜公園',
    nameZh: '上野恩赐公园',
    address: '東京都台東区上野公園5-20',
    shortDescription: '桜や美術館が楽しめる公園。',
    tags: ['dining'],
  });

  it('matches the place name', () => {
    expect(matchesPlaceQuery(ueno, '上野')).toBe(true);
  });

  it('matches the zh name variant', () => {
    expect(matchesPlaceQuery(ueno, '恩赐')).toBe(true);
  });

  it('does not match the address', () => {
    expect(matchesPlaceQuery(ueno, '台東区')).toBe(false);
  });

  it('does not match the short description', () => {
    expect(matchesPlaceQuery(ueno, '桜')).toBe(false);
  });

  it('does not match a tag', () => {
    expect(matchesPlaceQuery(ueno, 'dining')).toBe(false);
  });

  it('is case-insensitive for latin text in names', () => {
    const latin = makePlace({ id: 'latin', category: 'park', name: 'Shinjuku Gyoen' });
    expect(matchesPlaceQuery(latin, 'shinjuku')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(matchesPlaceQuery(ueno, '  上野  ')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesPlaceQuery(ueno, '大阪')).toBe(false);
  });

  it('treats empty or missing query as match-all', () => {
    expect(matchesPlaceQuery(ueno, '')).toBe(true);
    expect(matchesPlaceQuery(ueno, undefined)).toBe(true);
    expect(matchesPlaceQuery(ueno, '   ')).toBe(true);
  });
});

describe('filterPlaces query filtering', () => {
  it('filters places by text query', () => {
    const ueno = makePlace({
      id: 'ueno-park',
      category: 'park',
      name: '上野恩賜公園',
      address: '東京都台東区上野公園5-20',
    });
    const kasai = makePlace({
      id: 'kasai-rinkai-park',
      category: 'park',
      name: '葛西臨海公園',
      address: '東京都江戸川区臨海町6',
    });
    const filtered = filterPlaces(
      [ueno, kasai],
      { query: '葛西', referenceDate: '2026-08-10' },
    );
    expect(filtered.map((p) => p.id)).toEqual(['kasai-rinkai-park']);
  });

  it('combines query with other filters', () => {
    const park = makePlace({
      id: 'ueno-park',
      category: 'park',
      name: '上野恩賜公園',
      address: '東京都台東区上野公園5-20',
    });
    const museum = makePlace({
      id: 'ueno-museum',
      category: 'museum',
      name: '上野の森美術館',
      address: '東京都台東区上野公園1-2',
    });
    const filtered = filterPlaces(
      [park, museum],
      { category: 'park', query: '上野', referenceDate: '2026-08-10' },
    );
    expect(filtered.map((p) => p.id)).toEqual(['ueno-park']);
  });
});