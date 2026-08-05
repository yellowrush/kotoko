import { ApiClient } from '@kodoko/api-client';

let client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!client) {
    client = new ApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
    });
  }
  return client;
}
