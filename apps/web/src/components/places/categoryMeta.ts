import type { Place, PlaceCategory, PlaceLabel } from '@kodoko/domain';

export const CATEGORY_ICON: Record<PlaceCategory, string> = {
  park: '\u{1F333}',
  playground: '\u{1F6DD}',
  museum: '\u{1F3DB}\uFE0F',
  zoo: '\u{1F43C}',
  aquarium: '\u{1F420}',
  library: '\u{1F4DA}',
  facility: '\u{1F3E2}',
  'indoor-play': '\u{1F9F8}',
  shop: '\u{1F6CD}\uFE0F',
  restaurant: '\u{1F37D}\uFE0F',
  event: '\u{1F39F}\uFE0F',
  other: '\u{1F4CD}',
  'children-hall': '\u{1F3E0}',
  'toy-play': '\u{1F9E9}',
  'amusement-park': '\u{1F3A1}',
};

export type EventIconKind =
  | 'festival'
  | 'fireworks'
  | 'market'
  | 'parenting'
  | 'seasonal'
  | 'general';

export const EVENT_ICON: Record<EventIconKind, string> = {
  festival: '\u{1F3EE}',
  fireworks: '\u{1F386}',
  market: '\u{1F3F7}\uFE0F',
  parenting: '\u{1F9D2}',
  seasonal: '\u{1F338}',
  general: '\u{1F39F}\uFE0F',
};

export const TAG_ICON: Record<string, string> = {
  dining: '\u{1F37D}\uFE0F',
  'group-play': '\u{1F46A}',
  'stroller-friendly': '\u{1F6BC}',
  'quiet-zone': '\u{1F910}',
};

export const LABEL_ICON: Record<PlaceLabel, string> = {
  indoor: '\u{1F3E0}',
  outdoor: '\u{1F333}',
  mixed: '\u{1F501}',
  dining: '\u{1F37D}\uFE0F',
  'baby-car': '\u{1F6BC}',
  'nursing-room': '\u{1F37C}',
  'diaper-changing': '\u{1F9F7}',
  free: '\u{1F193}',
  'reservation-required': '\u{1F4DD}',
  'reservation-optional': '\u{1F4C5}',
  'english-ok': '\u{1F5E3}\uFE0F',
  petting: '\u{1F430}',
  'water-play': '\u{1F4A6}',
  picnic: '\u{1F9FA}',
  parking: '\u{1F17F}\uFE0F',
  wheelchair: '\u267F',
};

type IconPlace = Pick<
  Place,
  'category' | 'id' | 'name' | 'shortDescription' | 'description' | 'sourceUrl'
>;

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

export function getEventIconKind(place: IconPlace): EventIconKind {
  const text = [
    place.id,
    place.name,
    place.shortDescription,
    place.description,
    place.sourceUrl,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    includesAny(text, [
      'hanabi',
      'firework',
      '\u82b1\u706b',
      '\u7159\u706b',
    ])
  ) {
    return 'fireworks';
  }

  if (
    includesAny(text, [
      'flea',
      'market',
      'bazaar',
      'bazar',
      '\u30d5\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8',
      '\u86a4\u306e\u5e02',
      '\u30d0\u30b6\u30fc',
      '\u671d\u5e02',
      '\u9aa8\u8463\u5e02',
      '\u9752\u7a7a\u5e02',
      '\u7523\u76f4\u5e02',
    ])
  ) {
    return 'market';
  }

  if (
    includesAny(text, [
      'kodomo',
      'kids',
      'parent',
      '\u5b50\u80b2\u3066',
      '\u89aa\u5b50',
      '\u3053\u3069\u3082',
      '\u5b50\u3069\u3082',
      '\u5150\u7ae5',
    ])
  ) {
    return 'parenting';
  }

  if (
    includesAny(text, [
      'sakura',
      'cherry',
      'illumination',
      '\u685c',
      '\u3055\u304f\u3089',
      '\u7d05\u8449',
      '\u5b63\u7bc0',
      '\u30a4\u30eb\u30df\u30cd\u30fc\u30b7\u30e7\u30f3',
    ])
  ) {
    return 'seasonal';
  }

  if (
    includesAny(text, [
      'matsuri',
      'festival',
      'reitaisai',
      '\u796d',
      '\u796d\u308a',
      '\u307e\u3064\u308a',
      '\u4f8b\u5927\u796d',
    ])
  ) {
    return 'festival';
  }

  return 'general';
}

export function getPlaceIcon(place: IconPlace): string {
  if (place.category === 'event') {
    return EVENT_ICON[getEventIconKind(place)];
  }
  return CATEGORY_ICON[place.category];
}
