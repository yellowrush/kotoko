import type { GeoPoint, Place, WeatherSummary } from '@kodoko/domain';

export type TransportMode = 'walking' | 'bicycle' | 'car' | 'train';

export const TRANSPORT_MAX_DISTANCE_KM: Record<TransportMode, number> = {
  walking: 2,
  bicycle: 5,
  car: 20,
  train: 20,
};

export type ChildGroupMember = {
  ageMonths: number;
  interests: string[];
  accessibilityNeeds: string[];
};

export type RecommendationInput = {
  childAgeMonths: number;
  interests: string[];
  accessibilityNeeds: string[];
  children?: ChildGroupMember[];
  userLocation?: GeoPoint;
  maxDistanceKm?: number;
  transportMode?: TransportMode;
  groupSize?: number;
  indoorOutdoorPreference?: 'indoor' | 'outdoor' | 'mixed';
  weather?: WeatherSummary;
  places: Place[];
};

export type RecommendationReason = {
  code: string;
  message: string;
};

export type PlaceRecommendation = {
  place: Place;
  score: number;
  reasons: RecommendationReason[];
};

export type ScoreFactors = {
  ageMatch: number;
  distanceMatch: number;
  weatherMatch: number;
  indoorOutdoorMatch: number;
  facilityScore: number;
  interestMatch: number;
};

export const WEIGHTS: Record<keyof ScoreFactors, number> = {
  ageMatch: 0.25,
  distanceMatch: 0.2,
  weatherMatch: 0.15,
  indoorOutdoorMatch: 0.1,
  facilityScore: 0.1,
  interestMatch: 0.2,
};

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function isIndoorAwareWeather(weather?: WeatherSummary): boolean {
  return weather !== undefined && (weather.condition === 'rain' || weather.condition === 'snow' || weather.condition === 'storm');
}

export function scorePlace(place: Place, input: RecommendationInput): PlaceRecommendation {
  if (place.status !== 'published') {
    return { place, score: 0, reasons: [{ code: 'not_published', message: 'Non-public place' }] };
  }

  const reasons: RecommendationReason[] = [];
  const factors: ScoreFactors = { ageMatch: 0, distanceMatch: 0, weatherMatch: 0, indoorOutdoorMatch: 0, facilityScore: 0, interestMatch: 0 };

  // 同行グループ：複数子どもの場合は children、単一の場合は従来フィールドを使う。
  const group: ChildGroupMember[] =
    input.children && input.children.length > 0
      ? input.children
      : [{ ageMonths: input.childAgeMonths, interests: input.interests, accessibilityNeeds: input.accessibilityNeeds }];
  const interests = [...new Set(group.flatMap((c) => c.interests))];

  // 年龄匹配（全員が範囲内なら最適、一部のみなら部分一致）
  const min = place.suitableAgeMinMonths ?? 0;
  const max = place.suitableAgeMaxMonths ?? Infinity;
  const inRange = group.filter((c) => c.ageMonths >= min && c.ageMonths <= max).length;
  if (inRange === group.length) {
    factors.ageMatch = 1;
    reasons.push({ code: 'age_match', message: `Suitable for ${min}-${max === Infinity ? '+' : max} months` });
  } else if (inRange > 0) {
    factors.ageMatch = 0.6;
    reasons.push({ code: 'age_partial', message: `Suitable for ages ${min}-${max === Infinity ? '+' : max} for ${inRange} of ${group.length} children` });
  } else {
    factors.ageMatch = 0.2;
    reasons.push({ code: 'age_mismatch', message: 'Age range does not match any child' });
  }

  // 距离匹配
  if (input.userLocation) {
    const distance = haversineDistanceKm(input.userLocation, place);
    const maxKm =
      input.maxDistanceKm ??
      (input.transportMode ? TRANSPORT_MAX_DISTANCE_KM[input.transportMode] : 5);
    if (distance > maxKm) {
      return {
        place,
        score: 0,
        reasons: [{ code: 'distance', message: `${distance.toFixed(1)} km exceeds max distance of ${maxKm} km` }],
      };
    }
    factors.distanceMatch = Math.max(0, 1 - distance / (maxKm * 2));
    reasons.push({ code: 'distance', message: `About ${distance.toFixed(1)} km away` });
  } else {
    factors.distanceMatch = 0.5; // 未知距离，中性
  }

  // 天气匹配
  if (isIndoorAwareWeather(input.weather)) {
    factors.weatherMatch = place.indoorOutdoor === 'indoor' ? 1 : place.indoorOutdoor === 'mixed' ? 0.6 : 0.1;
    reasons.push({ code: 'weather', message: `Recommended ${place.indoorOutdoor === 'indoor' ? 'indoor' : 'sheltered'} on ${input.weather?.condition} day` });
  } else {
    factors.weatherMatch = 0.5;
  }

  // 室内外偏好
  if (input.indoorOutdoorPreference && input.indoorOutdoorPreference !== 'mixed') {
    if (place.indoorOutdoor === input.indoorOutdoorPreference || place.indoorOutdoor === 'mixed') {
      factors.indoorOutdoorMatch = 1;
      reasons.push({ code: 'indoor_outdoor', message: `Matches ${input.indoorOutdoorPreference} preference` });
    } else {
      factors.indoorOutdoorMatch = 0;
      reasons.push({ code: 'indoor_outdoor', message: `Does not match ${input.indoorOutdoorPreference} preference` });
    }
  } else {
    factors.indoorOutdoorMatch = 0.5;
  }

  // 设施便利度
  let facility = 0;
  let facilityCount = 0;
  if (place.strollerFriendly) {
    facility += 1;
    facilityCount += 1;
    reasons.push({ code: 'facility', message: 'Stroller friendly' });
  }
  if (place.nursingRoom) {
    facility += 1;
    facilityCount += 1;
    reasons.push({ code: 'facility', message: 'Nursing room available' });
  }
  if (place.diaperChanging) {
    facility += 1;
    facilityCount += 1;
    reasons.push({ code: 'facility', message: 'Diaper changing available' });
  }
  factors.facilityScore = facilityCount > 0 ? facility / 3 : 0.2;

  // 兴趣匹配（複数子どもの興味は全員分の和集合で判定）
  if (interests.length === 0) {
    factors.interestMatch = 0.5;
  } else {
    const matched = interests.filter((i) => place.category === i).length;
    factors.interestMatch = matched > 0 ? 1 : 0.3;
    if (matched > 0) reasons.push({ code: 'interest', message: 'Matches child interest' });
  }

  // 人数匹配：多人同行（3 人以上）時，適合多人的場所加分
  if (input.groupSize !== undefined && input.groupSize >= 3) {
    const groupTagged = place.tags?.includes('group-play') ?? false;
    factors.interestMatch = Math.max(factors.interestMatch, groupTagged ? 1 : 0.3);
    if (groupTagged) reasons.push({ code: 'group', message: 'Great for groups' });
  }

  const score = Math.round(
    (factors.ageMatch * WEIGHTS.ageMatch +
      factors.distanceMatch * WEIGHTS.distanceMatch +
      factors.weatherMatch * WEIGHTS.weatherMatch +
      factors.indoorOutdoorMatch * WEIGHTS.indoorOutdoorMatch +
      factors.facilityScore * WEIGHTS.facilityScore +
      factors.interestMatch * WEIGHTS.interestMatch) *
      100,
  );

  return { place, score, reasons };
}

export function recommendPlaces(input: RecommendationInput): PlaceRecommendation[] {
  return input.places
    .map((place) => scorePlace(place, input))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}