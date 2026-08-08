import { describe, expect, it } from 'vitest';
import { API_PREFIX, buildApp } from '../src/app';
import { buildContentVersion } from '../src/routes/content';

const publishedPlace = {
  id: 'place-1',
  status: 'published',
  sourceCheckedAt: '2026-08-01T00:00:00.000Z',
  version: 1,
};

const publishedKnowledge = {
  id: 'knowledge-1',
  status: 'published',
  reviewedAt: '2026-08-02T00:00:00.000Z',
};

const publishedPolicy = {
  id: 'policy-1',
  status: 'published',
  sourceCheckedAt: '2026-08-03T00:00:00.000Z',
  version: 1,
};

describe('GET /api/v1/content/version', () => {
  it('returns deterministic public content signatures without caching', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/content/version` });

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json()).toMatchObject({
      places: { count: expect.any(Number), signature: expect.any(String) },
      knowledge: { count: expect.any(Number), signature: expect.any(String) },
      policies: { count: expect.any(Number), signature: expect.any(String) },
      signature: expect.any(String),
    });

    await app.close();
  });
});

describe('buildContentVersion', () => {
  it('changes signature when public content metadata changes', () => {
    const before = buildContentVersion({
      places: [publishedPlace],
      knowledge: [publishedKnowledge],
      policies: [publishedPolicy],
    });

    const after = buildContentVersion({
      places: [{ ...publishedPlace, version: 2 }],
      knowledge: [publishedKnowledge],
      policies: [publishedPolicy],
    });

    expect(after.places.signature).not.toBe(before.places.signature);
    expect(after.signature).not.toBe(before.signature);
  });

  it('ignores archived content in signatures', () => {
    const before = buildContentVersion({
      places: [publishedPlace],
      knowledge: [publishedKnowledge],
      policies: [publishedPolicy],
    });

    const after = buildContentVersion({
      places: [
        publishedPlace,
        {
          id: 'archived-place',
          status: 'archived',
          sourceCheckedAt: '2026-12-01T00:00:00.000Z',
          version: 99,
        },
      ],
      knowledge: [publishedKnowledge],
      policies: [publishedPolicy],
    });

    expect(after.places).toEqual(before.places);
    expect(after.signature).toBe(before.signature);
  });
});
