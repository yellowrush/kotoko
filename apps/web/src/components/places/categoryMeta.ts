import type { PlaceCategory } from '@kodoko/domain';

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
};

export const TAG_ICON: Record<string, string> = {
  dining: '🍽️',
  'group-play': '🧑‍🤝‍🧑',
  'stroller-friendly': '👶',
  'quiet-zone': '🤫',
};