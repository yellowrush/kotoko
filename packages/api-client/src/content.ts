import type { ApiClient } from './client';
import { contentVersionSchema, type ContentVersionDTO } from './schemas';

export async function fetchContentVersion(client: ApiClient): Promise<ContentVersionDTO> {
  const data = await client.get<unknown>('/content/version');
  return contentVersionSchema.parse(data);
}
