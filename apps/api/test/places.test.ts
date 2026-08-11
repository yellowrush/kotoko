import { describe, expect, it } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';
import { seedPlaces } from '../src/data/places';

describe('seedPlaces event deduplication', () => {
  it('contains exactly one entry per event name', () => {
    const events = seedPlaces.filter((p) => p.category === 'event');
    const names = events.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('GET /api/v1/places', () => {
  it('returns only published places', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.places.every((p: { status: string }) => p.status === 'published')).toBe(true);
    await app.close();
  });

  it('filters by category', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places?category=park` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.places.every((p: { category: string }) => p.category === 'park')).toBe(true);
    await app.close();
  });

  it('filters by indoorOutdoor', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places?indoorOutdoor=indoor` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.places.every((p: { indoorOutdoor: string }) => p.indoorOutdoor === 'indoor')).toBe(true);
    await app.close();
  });

  it('filters by tags', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places?tags=dining` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.places.every((p: { tags?: string[] }) => p.tags?.includes('dining'))).toBe(true);
    await app.close();
  });

  it('exposes public transit access metadata for rail filtering', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places/kiba-park` });
    expect(res.statusCode).toBe(200);
    expect(res.json().transitAccess).toContainEqual(
      expect.objectContaining({ lineId: 'tokyo-metro-tozai', stationName: '木場' }),
    );
    await app.close();
  });

  it('includes Spadium Japon as a public family-usable facility', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places/spadium-japon` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: 'spadium-japon',
      category: 'facility',
      municipalityCode: '13222',
      nursingRoom: true,
      diaperChanging: true,
      parking: true,
    });
    expect(res.json().tags).toContain('dining');
    expect(res.json().transitAccess).toContainEqual(
      expect.objectContaining({ lineId: 'seibu-ikebukuro' }),
    );
    await app.close();
  });

  it('serves Kameido children hall source media links', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places/children-hall-kameido`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image',
          url: 'https://fukushi.unchusha.com/kameido/kameido.jpg',
          cover: true,
        }),
        expect.objectContaining({
          type: 'video',
          url: 'https://www.instagram.com/kotojido_kame/',
        }),
        expect.objectContaining({
          type: 'video',
          url: 'https://twitter.com/kotojido_kame/',
        }),
      ]),
    );
    await app.close();
  });

  it('serves Tokyo Toy Museum official media links', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places/tokyo-toy-museum`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      websiteUrl: 'https://art-play.or.jp/ttm/',
      sourceUrl: 'https://art-play.or.jp/ttm/',
    });
    expect(res.json().media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image',
          url: 'https://art-play.or.jp/ttm/assets/img/common/img_ogp.png',
          cover: true,
        }),
        expect.objectContaining({
          type: 'video',
          url: 'https://art-play.or.jp/ttm/assets/img/index/movie.mp4',
          thumbnailUrl: 'https://art-play.or.jp/ttm/assets/img/index/img_poster.jpg',
        }),
        expect.objectContaining({
          type: 'video',
          url: 'https://www.instagram.com/reel/Dbc3FssSMkk/',
        }),
        expect.objectContaining({
          type: 'video',
          url: 'https://www.youtube.com/channel/UCfMLoKVg_lC4J6YDIfVh8uQ',
        }),
      ]),
    );
    await app.close();
  });

  it('serves curated event places without duplicates from generated data', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places?category=event`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const names = body.places.map((p: { name: string }) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('すみだまつり・こどもまつり');
    expect(names).toContain('隅田川花火大会');

    const duplicate = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places/tokyo-event-1f5caf26e7f53ae3`,
    });
    expect(duplicate.statusCode).toBe(404);

    const curated = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places/sumida-matsuri-kodomo`,
    });
    expect(curated.statusCode).toBe(200);
    await app.close();
  });

  it('filters by radius from a center point', async () => {
    const app = buildApp();
    // 東京駅付近を中心に半径 2km 以内の地点のみ返す
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places?latitude=35.6812&longitude=139.7671&radius=2`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.places.length).toBeGreaterThan(0);
    expect(body.places.length).toBeLessThan(80);
    await app.close();
  });

  it('returns no places for a radius around an empty area', async () => {
    const app = buildApp();
    // 太平洋上を中心に半径 5km 以内には地点が存在しない
    const res = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/places?latitude=35.2&longitude=140.9&radius=5`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
    await app.close();
  });
});

describe('GET /api/v1/places/:placeId', () => {
  it('returns a place by id', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places/ueno-park` });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe('ueno-park');
    await app.close();
  });

  it('returns 404 for unknown place', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/places/does-not-exist` });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    await app.close();
  });
});

describe('GET /api/v1/content/version', () => {
  it('reports the places count', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/content/version` });
    expect(res.statusCode).toBe(200);
    expect(res.json().places.count).toBeGreaterThan(0);
    await app.close();
  });
});
