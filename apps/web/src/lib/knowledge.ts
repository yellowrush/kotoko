import type { KnowledgeContent } from '@kodoko/domain';

export function filterKnowledgeByAge(
  list: KnowledgeContent[],
  ageMonths?: number,
): KnowledgeContent[] {
  if (ageMonths === undefined) return list;
  return list.filter((item) => ageMonths >= item.minAgeMonths && ageMonths <= item.maxAgeMonths);
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