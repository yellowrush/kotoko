import type { KnowledgeContent } from '@kodoko/domain';

export function filterKnowledgeByAge(
  list: KnowledgeContent[],
  ageMonths?: number,
): KnowledgeContent[] {
  if (ageMonths === undefined) return list;
  return list.filter((item) => ageMonths >= item.minAgeMonths && ageMonths <= item.maxAgeMonths);
}

export function filterKnowledgeByAges(
  list: KnowledgeContent[],
  ageMonthsList: number[],
): KnowledgeContent[] {
  if (ageMonthsList.length === 0) return list;
  return list.filter((item) =>
    ageMonthsList.some((age) => age >= item.minAgeMonths && age <= item.maxAgeMonths),
  );
}

export function filterUpcomingKnowledgeByAge(
  list: KnowledgeContent[],
  ageMonths: number | undefined,
  windowMonths = 6,
): KnowledgeContent[] {
  if (ageMonths === undefined) return [];
  const maxUpcomingAge = ageMonths + windowMonths;
  return list.filter(
    (item) => ageMonths < item.minAgeMonths && item.minAgeMonths <= maxUpcomingAge,
  );
}

export function prioritizeKnowledgeForAges(
  list: KnowledgeContent[],
  ageMonthsList: number[],
  readIds: Set<string>,
  windowMonths = 6,
): KnowledgeContent[] {
  if (ageMonthsList.length === 0) return [];

  return [...list].sort((a, b) => {
    const aScore = knowledgePriorityScore(a, ageMonthsList, readIds, windowMonths);
    const bScore = knowledgePriorityScore(b, ageMonthsList, readIds, windowMonths);
    if (aScore.status !== bScore.status) return aScore.status - bScore.status;
    if (aScore.distance !== bScore.distance) return aScore.distance - bScore.distance;
    return a.minAgeMonths - b.minAgeMonths;
  });
}

export function sortKnowledgeByRead(
  list: KnowledgeContent[],
  readIds: Set<string>,
): KnowledgeContent[] {
  return [...list].sort((a, b) => {
    const aRead = readIds.has(a.id) ? 1 : 0;
    const bRead = readIds.has(b.id) ? 1 : 0;
    return aRead - bRead;
  });
}

function knowledgePriorityScore(
  item: KnowledgeContent,
  ageMonthsList: number[],
  readIds: Set<string>,
  windowMonths: number,
): { status: number; distance: number } {
  const readOffset = readIds.has(item.id) ? 2 : 0;
  const scores = ageMonthsList.map((age) => {
    if (age >= item.minAgeMonths && age <= item.maxAgeMonths) {
      return { status: readOffset, distance: 0 };
    }
    if (age < item.minAgeMonths && item.minAgeMonths <= age + windowMonths) {
      return { status: readOffset + 1, distance: item.minAgeMonths - age };
    }
    return { status: readOffset + 3, distance: Number.MAX_SAFE_INTEGER };
  });

  return scores.reduce((best, current) =>
    current.status < best.status ||
    (current.status === best.status && current.distance < best.distance)
      ? current
      : best,
  );
}
