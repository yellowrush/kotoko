import { describe, expect, it } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';

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
