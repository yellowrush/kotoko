export type PlaceCategory =
  | 'park'
  | 'playground'
  | 'museum'
  | 'zoo'
  | 'aquarium'
  | 'library'
  | 'facility'
  | 'indoor-play'
  | 'shop'
  | 'restaurant'
  | 'event'
  | 'other';

export type PlaceTag =
  | 'dining'
  | 'group-play'
  | 'stroller-friendly'
  | 'quiet-zone';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed';

export type ContentStatus = 'draft' | 'published' | 'archived';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string;
  municipalityCode: string;
  suitableAgeMinMonths?: number;
  suitableAgeMaxMonths?: number;
  indoorOutdoor: IndoorOutdoor;
  priceLevel?: number;
  strollerFriendly?: boolean;
  nursingRoom?: boolean;
  diaperChanging?: boolean;
  tags?: PlaceTag[];
  imageUrl?: string;
  shortDescription?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  status: ContentStatus;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type WeatherSummary = {
  condition: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'unknown';
  temperatureCelsius?: number;
};