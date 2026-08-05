import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/client';

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