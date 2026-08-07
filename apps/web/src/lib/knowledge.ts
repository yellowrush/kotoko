import type { KnowledgeContent } from '@kodoko/domain';

export function filterKnowledgeByAge(
  list: KnowledgeContent[],
  ageMonths?: number,
): KnowledgeContent[] {
  if (ageMonths === undefined) return list;
  return list.filter((item) => ageMonths >= item.minAgeMonths && ageMonths <= item.maxAgeMonths);
}

/** 複数子どもの場合、いずれかの子どもに該当する知識を残す（グループ向け）。 */
export function filterKnowledgeByAges(
  list: KnowledgeContent[],
  ageMonthsList: number[],
): KnowledgeContent[] {
  if (ageMonthsList.length === 0) return list;
  return list.filter((item) =>
    ageMonthsList.some((age) => age >= item.minAgeMonths && age <= item.maxAgeMonths),
  );
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