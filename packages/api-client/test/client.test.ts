import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/client';
import { fetchContentVersion } from '../src/content';
import { submitPlaceReport } from '../src/places';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('ApiClient', () => {
  it('sends credentials and json headers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetchImpl });

    await client.get('/api/v1/health');

    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/api/v1/health', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
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
