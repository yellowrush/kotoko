import type { GeoPoint } from '@kodoko/domain';
import { findMunicipality, type Municipality } from '@kodoko/domain';

export type RecommendationLocation =
  | { source: 'gps'; point: GeoPoint; municipality?: Municipality }
  | { source: 'municipality'; point: GeoPoint; municipality: Municipality }
  | { source: 'unknown'; point: undefined; municipality?: undefined };

export function resolveRecommendationLocation(
  gpsPoint: GeoPoint | null | undefined,
  municipalityCode: string | undefined,
): RecommendationLocation {
  if (gpsPoint) {
    return { source: 'gps', point: gpsPoint };
  }

  const municipality = findMunicipality(municipalityCode);
  if (municipality) {
    return {
      source: 'municipality',
      point: { latitude: municipality.latitude, longitude: municipality.longitude },
      municipality,
    };
  }

  return { source: 'unknown', point: undefined };
}
