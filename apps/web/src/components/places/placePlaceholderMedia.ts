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
