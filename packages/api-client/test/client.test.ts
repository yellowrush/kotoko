import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/client';
import { fetchContentVersion } from '../src/content';
import { fetchPlaceFacets, fetchPlaces, submitPlaceReport } from '../src/places';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('ApiClient', () => {
  it('sends credentials without json headers for bodyless requests', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await client.get('/api/v1/health');

    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/api/v1/health', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
    }));
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/health',
      expect.not.objectContaining({ headers: expect.anything() }),
    );
  });

  it('sends json headers when a request has a body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await client.post('/api/v1/auth/login', { email: 'parent@example.test' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'parent@example.test' }),
      }),
    );
  });

  it('parses success json', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'ok' }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const result = await client.get<{ status: string }>('/health');
    expect(result.status).toBe('ok');
  });

  it('maps error bodies to ApiError', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Authentication is required.', requestId: 'abc' } }),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.get('/session')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      requestId: 'abc',
    } as Partial<ApiError>);
  });

  it('normalizes non-json errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('oops', { status: 500 }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(client.get('/x')).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 500 });
  });
});

describe('submitPlaceReport', () => {
  it('POSTs to the place report endpoint and validates the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { id: 'r1', status: 'received' }),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    const result = await submitPlaceReport(client, 'ueno-park', {
      type: 'price',
      detail: '料金が変わりました',
    });

    expect(result).toEqual({ id: 'r1', status: 'received' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/places/ueno-park/reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'price', detail: '料金が変わりました' }),
      }),
    );
  });

  it('rejects an unexpected response body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'other' }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await expect(
      submitPlaceReport(client, 'ueno-park', { type: 'other' }),
    ).rejects.toThrow();
  });
});

describe('places client', () => {
  it('sends server-side place filters in the query string', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { places: [], total: 0 }),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await fetchPlaces(client, {
      category: 'facility',
      tags: ['dining', 'quiet-zone'],
      latitude: 35.6812,
      longitude: 139.7671,
      radius: 3,
      municipalityCode: '13222',
      railLineId: 'seibu-ikebukuro',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/places?category=facility&tags=dining%2Cquiet-zone&latitude=35.6812&longitude=139.7671&radius=3&municipality=13222&rail=seibu-ikebukuro',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fetches lightweight place facets', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        municipalities: { '13222': 1 },
        railLines: { 'seibu-ikebukuro': 1 },
        total: 1,
      }),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    const result = await fetchPlaceFacets(client, {
      category: 'facility',
      tags: ['dining'],
    });

    expect(result.municipalities['13222']).toBe(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/places/facets?category=facility&tags=dining',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('fetchContentVersion', () => {
  it('GETs the content version endpoint and validates the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        places: {
          count: 10,
          latestSourceCheckedAt: '2026-08-08T00:00:00.000Z',
          latestReviewedAt: null,
          maxVersion: 2,
          signature: 'places',
        },
        knowledge: {
          count: 3,
          latestSourceCheckedAt: null,
          latestReviewedAt: '2026-08-08T00:00:00.000Z',
          maxVersion: 0,
          signature: 'knowledge',
        },
        policies: {
          count: 4,
          latestSourceCheckedAt: '2026-08-08T00:00:00.000Z',
          latestReviewedAt: null,
          maxVersion: 1,
          signature: 'policies',
        },
        publishedAt: '2026-08-08T00:00:00.000Z',
        signature: 'all',
      }),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    const result = await fetchContentVersion(client);

    expect(result.signature).toBe('all');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/content/version',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
