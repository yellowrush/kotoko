import { describe, expect, it } from 'vitest';
import {
  placeSchema,
  placeListSchema,
  knowledgeSchema,
  knowledgeListSchema,
  policySchema,
  policyListSchema,
  contentVersionSchema,
} from '../src/schemas';

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

const validPolicy = {
  id: 'p-child-allowance',
  title: '児童手当',
  contextHint: '子育て世帯に支給される手当です。',
  authorityLevel: 'national',
  eligibilityRule: {
    all: [
      { field: 'child.ageMonths', operator: 'lte', value: 216 },
      { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
    ],
  },
  officialUrl: 'https://www.cfa.go.jp',
  sourceCheckedAt: '2026-01-10T00:00:00.000Z',
  version: 1,
  status: 'published',
  locale: 'ja',
};

describe('policySchema', () => {
  it('accepts a valid policy with nested rules', () => {
    expect(policySchema.parse(validPolicy)).toMatchObject({ id: 'p-child-allowance' });
  });

  it('accepts any-group rules', () => {
    const withAny = {
      ...validPolicy,
      eligibilityRule: {
        any: [
          { field: 'user.municipalityCode', operator: 'eq', value: '13101' },
          { field: 'user.municipalityCode', operator: 'eq', value: '13108' },
        ],
      },
    };
    expect(policySchema.parse(withAny).eligibilityRule).toHaveProperty('any');
  });

  it('rejects unknown operators', () => {
    expect(() =>
      policySchema.parse({
        ...validPolicy,
        eligibilityRule: { all: [{ field: 'a', operator: 'eval', value: 1 }] },
      }),
    ).toThrow();
  });

  it('rejects unknown authority level', () => {
    expect(() => policySchema.parse({ ...validPolicy, authorityLevel: 'city' })).toThrow();
  });
});

describe('policyListSchema', () => {
  it('accepts a list response', () => {
    const parsed = policyListSchema.parse({ policies: [validPolicy], total: 1 });
    expect(parsed.policies).toHaveLength(1);
  });

  it('rejects a policy without an official url', () => {
    expect(() =>
      policyListSchema.parse({ policies: [{ ...validPolicy, officialUrl: '' }], total: 1 }),
    ).toThrow();
  });
});

describe('contentVersionSchema', () => {
  it('accepts a public content version response', () => {
    const parsed = contentVersionSchema.parse({
      places: {
        count: 10,
        latestSourceCheckedAt: '2026-08-08T00:00:00.000Z',
        latestReviewedAt: null,
        maxVersion: 2,
        signature: 'places-signature',
      },
      knowledge: {
        count: 3,
        latestSourceCheckedAt: null,
        latestReviewedAt: '2026-08-08T00:00:00.000Z',
        maxVersion: 0,
        signature: 'knowledge-signature',
      },
      policies: {
        count: 4,
        latestSourceCheckedAt: '2026-08-08T00:00:00.000Z',
        latestReviewedAt: null,
        maxVersion: 1,
        signature: 'policies-signature',
      },
      publishedAt: '2026-08-08T00:00:00.000Z',
      signature: 'all-content-signature',
    });

    expect(parsed.places.count).toBe(10);
  });

  it('rejects missing collection signatures', () => {
    expect(() =>
      contentVersionSchema.parse({
        places: { count: 1, latestSourceCheckedAt: null, latestReviewedAt: null, maxVersion: 1 },
        knowledge: {
          count: 1,
          latestSourceCheckedAt: null,
          latestReviewedAt: null,
          maxVersion: 0,
          signature: 'knowledge',
        },
        policies: {
          count: 1,
          latestSourceCheckedAt: null,
          latestReviewedAt: null,
          maxVersion: 1,
          signature: 'policies',
        },
        publishedAt: null,
        signature: 'all',
      }),
    ).toThrow();
  });
});
