import { z } from 'zod';
import type { ApiClient } from './client';
import {
  placeFacetsSchema,
  placeListSchema,
  placeSchema,
  type PlaceDTO,
  type PlaceFacetsDTO,
} from './schemas';
import type { PlaceReportType } from '@kodoko/domain';

export type PlaceQuery = {
  category?: string;
  indoorOutdoor?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
  municipalityCode?: string;
  railLineId?: string;
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
  if (query.municipalityCode) params.set('municipality', query.municipalityCode);
  if (query.railLineId) params.set('rail', query.railLineId);
  if (query.locale) params.set('locale', query.locale);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchPlaces(
  client: ApiClient,
  query: PlaceQuery = {},
): Promise<PlaceDTO[]> {
  const data = await client.get<unknown>(`/places${buildQueryString(query)}`);
  const parsed = placeListSchema.parse(data);
  return parsed.places;
}

export async function fetchPlaceFacets(
  client: ApiClient,
  query: Pick<PlaceQuery, 'category' | 'indoorOutdoor' | 'tags'> = {},
): Promise<PlaceFacetsDTO> {
  const data = await client.get<unknown>(`/places/facets${buildQueryString(query)}`);
  return placeFacetsSchema.parse(data);
}

export async function fetchPlace(client: ApiClient, placeId: string): Promise<PlaceDTO> {
  const data = await client.get<unknown>(`/places/${placeId}`);
  return placeSchema.parse(data);
}

const reportResponseSchema = z.object({
  id: z.string().min(1),
  status: z.literal('received'),
  issue: z
    .discriminatedUnion('status', [
      z.object({
        status: z.literal('created'),
        issueNumber: z.number(),
        issueUrl: z.string().url(),
        labelStatus: z.enum(['applied', 'failed']).optional(),
      }),
      z.object({
        status: z.literal('skipped'),
        reason: z.enum(['missing_config', 'duplicate']),
      }),
      z.object({
        status: z.literal('failed'),
        reason: z.string(),
      }),
    ])
    .optional(),
});

export type SubmitPlaceReportResult = z.infer<typeof reportResponseSchema>;

export type SubmitPlaceReportInput = {
  type: PlaceReportType;
  detail?: string;
  contactEmail?: string;
};

export async function submitPlaceReport(
  client: ApiClient,
  placeId: string,
  input: SubmitPlaceReportInput,
): Promise<SubmitPlaceReportResult> {
  const data = await client.post<unknown>(`/places/${placeId}/reports`, input);
  return reportResponseSchema.parse(data);
}
