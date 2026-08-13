import type { Place, PlaceCategory } from '@kodoko/domain';

const CATEGORY_PLACEHOLDER_PREFIX: Record<PlaceCategory, string> = {
  park: 'park',
  playground: 'playground',
  museum: 'museum',
  zoo: 'zoo',
  aquarium: 'aquarium',
  library: 'library',
  facility: 'facility',
  'indoor-play': 'indoor-play',
  shop: 'shop',
  restaurant: 'restaurant',
  event: 'event',
  other: 'facility',
  'children-hall': 'children-hall',
  'toy-play': 'toy-play',
  'amusement-park': 'amusement-park',
};

const GENERIC_PLACE_ADDRESSES = new Set([
  '住所不明',
  '住所未確認',
  '日本',
  'Japan',
  '東京都',
  '東京都内',
  'Tokyo',
]);

function placeholderVariant(id: string): 1 | 2 | 3 {
  const checksum = [...id].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return ((checksum % 3) + 1) as 1 | 2 | 3;
}

export function getPlacePlaceholderImageUrl(
  place: Pick<Place, 'category' | 'id'>,
): string {
  const prefix = CATEGORY_PLACEHOLDER_PREFIX[place.category];
  return `/media/placeholder/${prefix}-${placeholderVariant(place.id)}.svg`;
}

export function getGoogleMapsSearchUrl(
  place: Pick<
    Place,
    'address' | 'googlePlaceId' | 'latitude' | 'longitude' | 'name'
  >,
): string {
  const coordinates = `${place.latitude},${place.longitude}`;
  const address = place.address?.trim();
  const hasUsefulAddress =
    Boolean(address) && !GENERIC_PLACE_ADDRESSES.has(address ?? '');
  const queryParts = [
    place.name,
    hasUsefulAddress ? address : undefined,
    coordinates,
  ].filter(Boolean);
  const query = queryParts.length > 0 ? queryParts.join(' ') : coordinates;
  const params = new URLSearchParams({ api: '1', query });

  if (place.googlePlaceId) {
    params.set('query_place_id', place.googlePlaceId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}
