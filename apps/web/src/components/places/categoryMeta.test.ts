import type { Place } from '@kodoko/domain';
import { describe, expect, it } from 'vitest';
import { EVENT_ICON, getEventIconKind, getPlaceIcon } from './categoryMeta';

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: 'event',
    name: 'Event',
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

describe('event map icons', () => {
  it('uses fireworks icon for hanabi events', () => {
    const place = makePlace({ id: 'sumidagawa-hanabi' });

    expect(getEventIconKind(place)).toBe('fireworks');
    expect(getPlaceIcon(place)).toBe(EVENT_ICON.fireworks);
  });

  it('uses parenting icon for kodomo events', () => {
    const place = makePlace({ id: 'sumida-matsuri-kodomo' });

    expect(getEventIconKind(place)).toBe('parenting');
    expect(getPlaceIcon(place)).toBe(EVENT_ICON.parenting);
  });

  it('uses market icon for flea market and bazaar events', () => {
    const place = makePlace({ id: 'tokyo-flea-market', name: 'Weekend bazaar' });

    expect(getEventIconKind(place)).toBe('market');
    expect(getPlaceIcon(place)).toBe(EVENT_ICON.market);
  });

  it('does not treat municipality suffix 市 in addresses as market', () => {
    const reitaisai = makePlace({
      id: 'akitsu-jinja-reitaisai',
      name: '秋津神社例大祭',
      shortDescription: '毎年7月27〜28日に秋津神社で開催される夏の例大祭（東村山市）。',
    });

    expect(getEventIconKind(reitaisai)).toBe('festival');
    expect(getPlaceIcon(reitaisai)).toBe(EVENT_ICON.festival);
  });

  it('uses market icon only for compound 市 market names', () => {
    const place = makePlace({ id: 'osakana-asaichi', name: '朝市', shortDescription: '毎週日曜に漁港で開催される朝市。' });

    expect(getEventIconKind(place)).toBe('market');
    expect(getPlaceIcon(place)).toBe(EVENT_ICON.market);
  });

  it('uses festival icon for genroku city festival attached market', () => {
    const place = makePlace({ id: 'kira-matsuri-genroku-ichi', name: '吉良祭・元禄市' });

    expect(getEventIconKind(place)).toBe('festival');
    expect(getPlaceIcon(place)).toBe(EVENT_ICON.festival);
  });

  it('uses seasonal icon for hiragana sakura events', () => {
    const place = makePlace({
      id: 'higashimurayama-sakura-matsuri',
      name: 'さくらまつり（東村山市）',
      shortDescription: '毎年4月上旬、東村山市内各所でお花見まつりを開催。',
    });

    expect(getEventIconKind(place)).toBe('seasonal');
    expect(getPlaceIcon(place)).toBe(EVENT_ICON.seasonal);
  });

  it('uses festival icon for higashimurayama events with 市 in address', () => {
    const jizo = makePlace({
      id: 'jizo-matsuri-higashimurayama',
      name: '地蔵まつり',
      shortDescription: '毎年11月3日に正福寺で開催される地蔵まつり（東村山市）。',
    });

    expect(getEventIconKind(jizo)).toBe('festival');
    expect(getPlaceIcon(jizo)).toBe(EVENT_ICON.festival);
  });

  it('keeps non-event places on category icons', () => {
    const place = makePlace({ category: 'park', id: 'ueno-park' });

    expect(getPlaceIcon(place)).toBe('\u{1F333}');
  });
});
