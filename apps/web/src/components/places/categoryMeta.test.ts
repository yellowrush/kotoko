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

  it('keeps non-event places on category icons', () => {
    const place = makePlace({ category: 'park', id: 'ueno-park' });

    expect(getPlaceIcon(place)).toBe('\u{1F333}');
  });
});
