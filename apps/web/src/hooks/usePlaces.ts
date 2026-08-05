import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Place } from '@kodoko/domain';
import { fetchPlaces, fetchPlace } from '@kodoko/api-client';
import { getApiClient } from '../lib/api';

export type PlacesFilterState = {
  category: string | undefined;
  indoorOutdoor: string | undefined;
  tags: string[];
  radiusKm: number | undefined;
  placeId: string | undefined;
};

const RADIUS_OPTIONS = ['3', '5', '10', '20'] as const;

export function usePlaces() {
  return useQuery<Place[]>({
    queryKey: ['places'],
    queryFn: async () => fetchPlaces(getApiClient()),
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
    const category = searchParams.get('category') ?? undefined;
    const indoorOutdoor = searchParams.get('indoorOutdoor') ?? undefined;
    const tags = (searchParams.get('tags') ?? '').split(',').filter(Boolean);
    const radiusParam = searchParams.get('radius');
    const radiusKm = RADIUS_OPTIONS.includes(radiusParam as (typeof RADIUS_OPTIONS)[number])
      ? Number(radiusParam)
      : undefined;
    const placeId = searchParams.get('place') ?? undefined;
    return { category, indoorOutdoor, tags, radiusKm, placeId };
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
  const setRadius = useCallback((radiusKm: number | undefined) => update({ radius: radiusKm ? String(radiusKm) : undefined }), [update]);
  const setPlaceId = useCallback((placeId: string | undefined) => update({ place: placeId }), [update]);

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

  return { filters, setCategory, setIndoorOutdoor, setRadius, setPlaceId, toggleTag };
}
