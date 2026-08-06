import { describe, expect, it } from 'vitest';
import type { KnowledgeContent } from '@kodoko/domain';
import { filterKnowledgeByAge, sortKnowledgeByRead } from './knowledge';

function makeItem(overrides: Partial<KnowledgeContent> & { id: string }): KnowledgeContent {
  return {
    title: overrides.id,
    summary: 's',
    body: 'b',
    minAgeMonths: 0,
    maxAgeMonths: 120,
    categories: ['development'],
    locale: 'ja',
    sourceReferences: [],
    status: 'published',
    ...overrides,
  };
}

describe('filterKnowledgeByAge', () => {
  it('returns everything when the age is unknown', () => {
    const list = [makeItem({ id: 'a', minAgeMonths: 0, maxAgeMonths: 6 })];
    expect(filterKnowledgeByAge(list)).toHaveLength(1);
  });

  it('matches the child age to the content range inclusively', () => {
    const infant = makeItem({ id: 'i', minAgeMonths: 0, maxAgeMonths: 6 });
    const toddler = makeItem({ id: 't', minAgeMonths: 18, maxAgeMonths: 48 });
    const result = filterKnowledgeByAge([infant, toddler], 20);
    expect(result.map((k) => k.id)).toEqual(['t']);
  });
});

describe('sortKnowledgeByRead', () => {
  it('puts unread items before read items', () => {
    const read = makeItem({ id: 'read' });
    const unread = makeItem({ id: 'unread' });
    const result = sortKnowledgeByRead([read, unread], new Set(['read']));
    expect(result.map((k) => k.id)).toEqual(['unread', 'read']);
  });

  it('does not reorder when all items have the same status', () => {
    const a = makeItem({ id: 'a' });
    const b = makeItem({ id: 'b' });
    const result = sortKnowledgeByRead([b, a], new Set());
    expect(result.map((k) => k.id)).toEqual(['b', 'a']);
  });
});