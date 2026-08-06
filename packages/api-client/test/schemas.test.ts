import { describe, expect, it } from 'vitest';
import { placeSchema, placeListSchema, knowledgeSchema, knowledgeListSchema } from '../src/schemas';

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

const validKnowledge = {
  id: 'k-vaccination',
  title: '予防接種のスケジュールと受け方',
  summary: '定期予防接種の基本',
  body: '定期予防接種のスケジュールを確認しましょう。',
  minAgeMonths: 0,
  maxAgeMonths: 18,
  categories: ['health', 'policy'],
  locale: 'ja',
  sourceReferences: [{ title: '厚生労働省', url: 'https://www.mhlw.go.jp' }],
  status: 'published',
};

describe('knowledgeSchema', () => {
  it('accepts valid knowledge content', () => {
    expect(knowledgeSchema.parse(validKnowledge)).toMatchObject({ id: 'k-vaccination' });
  });

  it('rejects an unknown category', () => {
    expect(() => knowledgeSchema.parse({ ...validKnowledge, categories: ['nope'] })).toThrow();
  });

  it('rejects a missing body', () => {
    expect(() => knowledgeSchema.parse({ ...validKnowledge, body: '' })).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => knowledgeSchema.parse({ ...validKnowledge, status: 'live' })).toThrow();
  });
});

describe('knowledgeListSchema', () => {
  it('accepts a list response', () => {
    const parsed = knowledgeListSchema.parse({ knowledge: [validKnowledge], total: 1 });
    expect(parsed.knowledge).toHaveLength(1);
  });

  it('rejects a list item that fails validation', () => {
    expect(() =>
      knowledgeListSchema.parse({ knowledge: [{ ...validKnowledge, minAgeMonths: -1 }], total: 1 }),
    ).toThrow();
  });
});
