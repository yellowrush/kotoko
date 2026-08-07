import type { ChildProfile, GeoPoint, Place, WeatherSummary } from '@kodoko/domain';
import { calculateAgeMonths } from '@kodoko/domain';
import {
  haversineDistanceKm,
  recommendPlaces,
  scorePlace,
  type PlaceRecommendation,
  type TransportMode,
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
  children?: ChildProfile[];
  child?: ChildProfile | null;
  places: Place[];
  userLocation?: GeoPoint | null;
  maxDistanceKm?: number;
  transportMode?: TransportMode;
  groupSize?: number;
  weather?: WeatherSummary;
}): HomeRecommendation[] {
  const party =
    input.children && input.children.length > 0
      ? input.children
      : input.child
        ? [input.child]
        : [];
  if (party.length === 0) return [];

  const recs = recommendPlaces({
    children: party.map((c) => ({
      ageMonths: calculateAgeMonths(c.birthDate),
      interests: c.interests,
      accessibilityNeeds: c.accessibilityNeeds,
    })),
    childAgeMonths: calculateAgeMonths(party[0]!.birthDate),
    interests: party[0]!.interests,
    accessibilityNeeds: party[0]!.accessibilityNeeds,
    userLocation: input.userLocation ?? undefined,
    maxDistanceKm: input.maxDistanceKm ?? (input.transportMode ? undefined : HOME_MAX_DISTANCE_KM),
    transportMode: input.transportMode,
    groupSize: input.groupSize,
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

// 沒有登錄兒童時仍顯示可解釋的推薦理由（設施/室內外/天氣），讓推薦區塊在有地點時必定出現。
export function placeGeneralCodes(place: Place, weather?: WeatherSummary): string[] {
  const codes: string[] = [];
  if (place.strollerFriendly || place.nursingRoom || place.diaperChanging) {
    codes.push('facility');
  }
  if (
    weather &&
    (weather.condition === 'rain' || weather.condition === 'snow' || weather.condition === 'storm')
  ) {
    codes.push('weather');
  }
  return codes;
}