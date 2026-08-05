import { describe, expect, it } from 'vitest';
import { placeSchema, placeListSchema } from '../src/schemas';

const validPlace = {
  id: 'ueno-park',
  name: '上野恩賜公園',
  category: 'park',
  latitude: 35.7148,
  longitude: 139.7744,
  address: '東京都台東区上野公園',
  municipalityCode: '13106',
  indoorOutdoor: 'outdoor',
  status: 'published',
  tags: ['stroller-friendly'],
};

describe('placeSchema', () => {
  it('accepts a valid place', () => {
    expect(placeSchema.parse(validPlace)).toMatchObject({ id: 'ueno-park' });
  });

  it('rejects invalid category', () => {
    expect(() => placeSchema.parse({ ...validPlace, category: 'nope' })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => placeSchema.parse({ ...validPlace, status: 'live' })).toThrow();
  });

  it('rejects non-finite coordinates', () => {
    expect(() => placeSchema.parse({ ...validPlace, latitude: NaN })).toThrow();
  });

  it('rejects unknown tags', () => {
    expect(() => placeSchema.parse({ ...validPlace, tags: ['unknown-tag'] })).toThrow();
  });
});

describe('placeListSchema', () => {
  it('accepts a list response', () => {
    const parsed = placeListSchema.parse({ places: [validPlace], total: 1 });
    expect(parsed.places).toHaveLength(1);
  });

  it('rejects a list item that fails validation', () => {
    expect(() =>
      placeListSchema.parse({ places: [{ ...validPlace, latitude: 'x' }], total: 1 }),
    ).toThrow();
  });
});
