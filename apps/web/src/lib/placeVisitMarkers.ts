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

// 回訪熱度改以 marker 外圈 ring 呈現，避免覆蓋 Q 版貼紙底色。
export function getVisitMarkerToneClass(count: number): string {
  switch (getVisitMarkerTone(count)) {
    case 'high':
      return 'ring-4 ring-amber-500';
    case 'medium':
      return 'ring-4 ring-brand-600';
    case 'low':
      return 'ring-2 ring-orange-300';
    case 'none':
      return 'ring-0';
  }
}
