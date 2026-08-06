import type { PlaceCategory, PlaceLabel } from '@kodoko/domain';

export const CATEGORY_ICON: Record<PlaceCategory, string> = {
  park: '🌳',
  playground: '🎠',
  museum: '🏛️',
  zoo: '🦁',
  aquarium: '🐠',
  library: '📚',
  facility: '🏢',
  'indoor-play': '🧸',
  shop: '🛍️',
  restaurant: '🍽️',
  event: '🎪',
  other: '📍',
  'children-hall': '🧒',
  'toy-play': '🧩',
  'amusement-park': '🎢',
};

export const TAG_ICON: Record<string, string> = {
  dining: '🍽️',
  'group-play': '🧑‍🤝‍🧑',
  'stroller-friendly': '👶',
  'quiet-zone': '🤫',
};

export const LABEL_ICON: Record<PlaceLabel, string> = {
  indoor: '🏠',
  outdoor: '🌳',
  mixed: '🌤️',
  dining: '🍽️',
  'baby-car': '👶',
  'nursing-room': '🍼',
  'diaper-changing': '🟰',
  free: '🆓',
  'reservation-required': '📅',
  'reservation-optional': '📆',
  'english-ok': '🗣️',
  petting: '🐰',
  'water-play': '💦',
  picnic: '🍱',
  parking: '🅿️',
  wheelchair: '♿',
};
