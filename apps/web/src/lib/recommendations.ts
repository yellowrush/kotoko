import type { ChildProfile, GeoPoint, Place, WeatherSummary } from '@kodoko/domain';
import { calculateAgeMonths } from '@kodoko/domain';
import {
  haversineDistanceKm,
  recommendPlaces,
  scorePlace,
  type PlaceRecommendation,
} from '@kodoko/recommendation';

export type HomeRecommendation = {
  place: Place;
  score: number;
  distanceKm: number | null;
  reasonCodes: string[];
};

const HOME_MAX_DISTANCE_KM = 20;
const HOME_LIMIT = 3;

function dedupe(codes: string[]): string[] {
  return [...new Set(codes)];
}

export function recommendForChild(input: {
  child: ChildProfile | null | undefined;
  places: Place[];
  userLocation?: GeoPoint | null;
  maxDistanceKm?: number;
  weather?: WeatherSummary;
}): HomeRecommendation[] {
  if (!input.child) return [];

  const recs = recommendPlaces({
    childAgeMonths: calculateAgeMonths(input.child.birthDate),
    interests: input.child.interests,
    accessibilityNeeds: input.child.accessibilityNeeds,
    userLocation: input.userLocation ?? undefined,
    maxDistanceKm: input.maxDistanceKm ?? HOME_MAX_DISTANCE_KM,
    weather: input.weather,
    places: input.places,
  });

  return recs.slice(0, HOME_LIMIT).map((r) => ({
    place: r.place,
    score: r.score,
    distanceKm: input.userLocation
      ? haversineDistanceKm(input.userLocation, r.place)
      : null,
    reasonCodes: dedupe(r.reasons.map((reason) => reason.code)),
  }));
}

export function scorePlaceForChild(input: {
  child: ChildProfile | null | undefined;
  place: Place;
  userLocation?: GeoPoint | null;
  weather?: WeatherSummary;
}): PlaceRecommendation | undefined {
  if (!input.child) return undefined;
  return scorePlace(input.place, {
    childAgeMonths: calculateAgeMonths(input.child.birthDate),
    interests: input.child.interests,
    accessibilityNeeds: input.child.accessibilityNeeds,
    userLocation: input.userLocation ?? undefined,
    weather: input.weather,
    places: [input.place],
  });
}