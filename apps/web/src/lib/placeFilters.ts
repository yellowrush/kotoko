import type { Place, GeoPoint, PlaceTag } from '@kodoko/domain';
import { haversineDistanceKm } from '@kodoko/recommendation';
import type { PlacesLocationMode } from '../hooks/usePlaces';

export type PlaceFilters = {
  locationMode?: PlacesLocationMode;
  category?: string;
  indoorOutdoor?: string;
  tags?: string[];
  radiusKm?: number;
  municipalityCode?: string;
  railLineId?: string;
  userLocation?: GeoPoint;
  referenceDate?: string;
  query?: string;
};

function normalizeQuery(value: string | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function matchesPlaceQuery(place: Place, query: string | undefined): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystack = [place.name, place.nameZh ?? ''].join(' ').toLocaleLowerCase();
  return haystack.includes(q);
}

export type FilteredPlace = Place & {
  distanceKm: number | null;
  ageSuitable: boolean;
};

const EVENT_LOOKAHEAD_DAYS = 90;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dayOfYear(month: number, day: number): number {
  let days = day;
  for (let i = 0; i < month - 1; i += 1) days += MONTH_DAYS[i] ?? 0;
  return days;
}

function parseReferenceDate(value?: string): Date {
  if (!value) return new Date();
  const [year = 2000, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isEventInSeason(place: Place, referenceDate: Date = new Date()): boolean {
  const period = place.eventPeriod;
  if (!period) return true;
  const startDay = period.startDay ?? 1;
  const endDay = period.endDay ?? MONTH_DAYS[period.endMonth - 1] ?? 31;
  const today = dayOfYear(referenceDate.getMonth() + 1, referenceDate.getDate());
  const start = dayOfYear(period.startMonth, startDay);
  const end = dayOfYear(period.endMonth, endDay);
  const active = start <= end ? today >= start && today <= end : today >= start || today <= end;
  if (active) return true;
  const nextStart = today <= start ? start : start + 365;
  return nextStart - today <= EVENT_LOOKAHEAD_DAYS;
}

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
  const locationMode = filters.locationMode ?? 'near';
  const referenceDate = parseReferenceDate(filters.referenceDate);
const result = places.filter((place) => {
    if (place.category === 'event' && !isEventInSeason(place, referenceDate)) return false;
    if (filters.category && place.category !== filters.category) return false;
    if (filters.indoorOutdoor && place.indoorOutdoor !== filters.indoorOutdoor) return false;
    if (filters.tags && filters.tags.length > 0 && !filters.tags.some((tag) => place.tags?.includes(tag as PlaceTag))) {
      return false;
    }
    if (!matchesPlaceQuery(place, filters.query)) return false;
    if (locationMode === 'municipality' && filters.municipalityCode) {
      if (place.municipalityCode !== filters.municipalityCode) return false;
    }
    if (locationMode === 'rail' && filters.railLineId) {
      if (!place.transitAccess?.some((access) => access.lineId === filters.railLineId)) {
        return false;
      }
    }
    if (locationMode === 'near' && filters.userLocation && filters.radiusKm !== undefined) {
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
