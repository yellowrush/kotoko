import type { Place, GeoPoint, PlaceTag } from '@kodoko/domain';
import { haversineDistanceKm } from '@kodoko/recommendation';

export type PlaceFilters = {
  category?: string;
  indoorOutdoor?: string;
  tags?: string[];
  radiusKm?: number;
  userLocation?: GeoPoint;
};

export type FilteredPlace = Place & {
  distanceKm: number | null;
  ageSuitable: boolean;
};

export function isAgeSuitable(place: Place, ageMonths: number): boolean {
  if (place.suitableAgeMinMonths === undefined && place.suitableAgeMaxMonths === undefined) {
    return true;
  }
  const min = place.suitableAgeMinMonths ?? 0;
  const max = place.suitableAgeMaxMonths ?? Number.POSITIVE_INFINITY;
  return ageMonths >= min && ageMonths <= max;
}

export function formatDistanceKm(km: number | null): string {
  if (km === null) return '--';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function filterPlaces(
  places: Place[],
  filters: PlaceFilters,
  ageMonths?: number,
): FilteredPlace[] {
  const result = places.filter((place) => {
    if (filters.category && place.category !== filters.category) return false;
    if (filters.indoorOutdoor && place.indoorOutdoor !== filters.indoorOutdoor) return false;
    if (filters.tags && filters.tags.length > 0 && !filters.tags.some((tag) => place.tags?.includes(tag as PlaceTag))) {
      return false;
    }
    if (filters.userLocation && filters.radiusKm !== undefined) {
      const dist = haversineDistanceKm(filters.userLocation, place);
      if (dist > filters.radiusKm) return false;
    }
    return true;
  });

  return result
    .map((place) => ({
      ...place,
      distanceKm: filters.userLocation ? haversineDistanceKm(filters.userLocation, place) : null,
      ageSuitable: ageMonths === undefined ? true : isAgeSuitable(place, ageMonths),
    }))
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return a.name.localeCompare(b.name);
    });
}
