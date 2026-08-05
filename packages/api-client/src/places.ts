import type { ApiClient } from './client';
import { placeListSchema, placeSchema, type PlaceDTO } from './schemas';

export type PlaceQuery = {
  category?: string;
  indoorOutdoor?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
  locale?: string;
};

function buildQueryString(query: PlaceQuery): string {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.indoorOutdoor) params.set('indoorOutdoor', query.indoorOutdoor);
  if (query.tags && query.tags.length > 0) params.set('tags', query.tags.join(','));
  if (query.latitude !== undefined) params.set('latitude', String(query.latitude));
  if (query.longitude !== undefined) params.set('longitude', String(query.longitude));
  if (query.radius !== undefined) params.set('radius', String(query.radius));
  if (query.locale) params.set('locale', query.locale);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchPlaces(
  client: ApiClient,
  query: PlaceQuery = {},
): Promise<PlaceDTO[]> {
  const data = await client.get<unknown>(`/api/v1/places${buildQueryString(query)}`);
  const parsed = placeListSchema.parse(data);
  return parsed.places;
}

export async function fetchPlace(client: ApiClient, placeId: string): Promise<PlaceDTO> {
  const data = await client.get<unknown>(`/api/v1/places/${placeId}`);
  return placeSchema.parse(data);
}
