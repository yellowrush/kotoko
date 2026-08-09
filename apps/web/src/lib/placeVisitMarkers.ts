import type { PlaceVisit } from '@kodoko/domain';

export type VisitMarkerTone = 'none' | 'low' | 'medium' | 'high';

export function getVisitMarkerTone(count: number): VisitMarkerTone {
  if (count >= 6) return 'high';
  if (count >= 3) return 'medium';
  if (count >= 1) return 'low';
  return 'none';
}

export function countVisitsByPlaceId(
  visits: readonly Pick<PlaceVisit, 'placeId'>[],
): Record<string, number> {
  return visits.reduce<Record<string, number>>((counts, visit) => {
    counts[visit.placeId] = (counts[visit.placeId] ?? 0) + 1;
    return counts;
  }, {});
}

export function getVisitMarkerToneClass(count: number): string {
  switch (getVisitMarkerTone(count)) {
    case 'high':
      return 'border-amber-500 bg-amber-300 text-amber-950';
    case 'medium':
      return 'border-brand-600 bg-brand-500 text-white';
    case 'low':
      return 'border-orange-300 bg-orange-100 text-orange-900';
    case 'none':
      return 'border-brand-700 bg-white text-gray-900';
  }
}
