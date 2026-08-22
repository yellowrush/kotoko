import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Place } from '@kodoko/domain';
import {
  fetchPlace,
  fetchPlaceFacets,
  fetchPlaces,
  type PlaceFacetsDTO,
  type PlaceQuery,
} from '@kodoko/api-client';
import { getApiClient } from '../lib/api';

export type PlacesLocationMode = 'near' | 'municipality' | 'rail';

export type PlacesFilterState = {
  locationMode: PlacesLocationMode;
  category: string | undefined;
  indoorOutdoor: string | undefined;
  tags: string[];
  radiusKm: number | undefined;
  municipalityCode: string | undefined;
  railLineId: string | undefined;
  placeId: string | undefined;
  query: string | undefined;
};

const LOCATION_MODES: PlacesLocationMode[] = ['near', 'municipality', 'rail'];
export const MIN_PLACES_RADIUS_KM = 1;
export const DEFAULT_PLACES_RADIUS_KM = 1;
export const MAX_PLACES_RADIUS_KM = 20;

function parseRadiusParam(radiusParam: string | null) {
  const radiusKm = Number(radiusParam);
  return Number.isInteger(radiusKm) &&
    radiusKm >= MIN_PLACES_RADIUS_KM &&
    radiusKm <= MAX_PLACES_RADIUS_KM
    ? radiusKm
    : undefined;
}

function normalizeRadiusKm(radiusKm: number | undefined) {
  if (radiusKm === undefined || !Number.isFinite(radiusKm)) return undefined;
  return Math.min(
    MAX_PLACES_RADIUS_KM,
    Math.max(MIN_PLACES_RADIUS_KM, Math.round(radiusKm)),
  );
}

type UsePlacesOptions = {
  enabled?: boolean;
};

type PlaceFacetQuery = Pick<PlaceQuery, 'category' | 'indoorOutdoor' | 'tags'>;

function normalizePlaceQuery(query: PlaceQuery = {}): PlaceQuery {
  const tags = query.tags?.filter(Boolean).sort();
  return {
    category: query.category,
    indoorOutdoor: query.indoorOutdoor,
    tags: tags && tags.length > 0 ? tags : undefined,
    latitude: query.latitude,
    longitude: query.longitude,
    radius: query.radius,
    municipalityCode: query.municipalityCode,
    railLineId: query.railLineId,
    locale: query.locale,
  };
}

export function usePlaces(query: PlaceQuery = {}, options: UsePlacesOptions = {}) {
  const normalizedQuery = normalizePlaceQuery(query);
  return useQuery<Place[]>({
    queryKey: ['places', normalizedQuery],
    queryFn: async () => fetchPlaces(getApiClient(), normalizedQuery),
    enabled: options.enabled ?? true,
    placeholderData: (previous) => previous,
  });
}

export function usePlaceFacets(query: PlaceFacetQuery = {}) {
  const normalizedQuery = normalizePlaceQuery(query);
  return useQuery<PlaceFacetsDTO>({
    queryKey: ['place-facets', normalizedQuery],
    queryFn: async () => fetchPlaceFacets(getApiClient(), normalizedQuery),
    placeholderData: (previous) => previous,
  });
}

export function usePlace(placeId: string | undefined) {
  return useQuery<Place>({
    queryKey: ['place', placeId],
    queryFn: async () => fetchPlace(getApiClient(), placeId as string),
    enabled: !!placeId,
  });
}

export function usePlacesFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<PlacesFilterState>(() => {
    const modeParam = searchParams.get('mode');
    const locationMode = LOCATION_MODES.includes(modeParam as PlacesLocationMode)
      ? (modeParam as PlacesLocationMode)
      : 'near';
    const category = searchParams.get('category') ?? undefined;
    const indoorOutdoor = searchParams.get('indoorOutdoor') ?? undefined;
    const tags = (searchParams.get('tags') ?? '').split(',').filter(Boolean);
    const radiusParam = searchParams.get('radius');
    const radiusKm =
      locationMode === 'near'
        ? parseRadiusParam(radiusParam) ?? DEFAULT_PLACES_RADIUS_KM
        : undefined;
    const municipalityCode =
      locationMode === 'municipality'
        ? (searchParams.get('municipality') ?? undefined)
: undefined;
    const railLineId =
      locationMode === 'rail' ? (searchParams.get('rail') ?? undefined) : undefined;
    const placeId = searchParams.get('place') ?? undefined;
    const query = searchParams.get('q') ?? undefined;
    return {
      locationMode,
      category,
      indoorOutdoor,
      tags,
      radiusKm,
      municipalityCode,
      railLineId,
      placeId,
      query,
    };
  }, [searchParams]);

  const update = useCallback(
    (next: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(next)) {
            if (value === undefined || value === '') params.delete(key);
            else params.set(key, value);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCategory = useCallback(
    (category: string | undefined) => update({ category }),
    [update],
  );
  const setIndoorOutdoor = useCallback(
    (indoorOutdoor: string | undefined) => update({ indoorOutdoor }),
    [update],
  );
  const setLocationMode = useCallback(
    (locationMode: PlacesLocationMode) =>
      update({
        mode: locationMode === 'near' ? undefined : locationMode,
        municipality: undefined,
        rail: undefined,
        place: undefined,
        radius: locationMode === 'near' ? searchParams.get('radius') ?? undefined : undefined,
      }),
    [searchParams, update],
  );
  const setRadius = useCallback(
    (radiusKm: number | undefined) => {
      const normalizedRadiusKm = normalizeRadiusKm(radiusKm);
      update({
        mode: undefined,
        radius:
          normalizedRadiusKm === undefined ? undefined : String(normalizedRadiusKm),
        municipality: undefined,
        rail: undefined,
        place: undefined,
      });
    },
    [update],
  );
  const setMunicipality = useCallback(
    (municipalityCode: string | undefined) =>
      update({
        mode: 'municipality',
        municipality: municipalityCode,
        rail: undefined,
        radius: undefined,
        place: undefined,
      }),
    [update],
  );
  const setRailLine = useCallback(
    (railLineId: string | undefined) =>
      update({
        mode: 'rail',
        rail: railLineId,
        municipality: undefined,
        radius: undefined,
        place: undefined,
      }),
    [update],
  );
  const setPlaceId = useCallback((placeId: string | undefined) => update({ place: placeId }), [update]);

  const setQuery = useCallback(
    (query: string | undefined) => {
      const normalized = query?.trim() || undefined;
      update({ q: normalized, place: undefined });
    },
    [update],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        const current = (params.get('tags') ?? '').split(',').filter(Boolean);
        const next = current.includes(tag)
          ? current.filter((t) => t !== tag)
          : [...current, tag];
        if (next.length === 0) params.delete('tags');
        else params.set('tags', next.join(','));
        return params;
      }, { replace: true });
    },
    [setSearchParams],
  );

return {
    filters,
    setCategory,
    setIndoorOutdoor,
    setLocationMode,
    setRadius,
    setMunicipality,
    setRailLine,
    setPlaceId,
    setQuery,
    toggleTag,
  };
}
