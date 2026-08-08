import { describe, expect, it } from 'vitest';
import type { KnowledgeContent } from '@kodoko/domain';
import {
  filterKnowledgeByAge,
  filterUpcomingKnowledgeByAge,
  prioritizeKnowledgeForAges,
  sortKnowledgeByRead,
} from './knowledge';

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

describe('filterUpcomingKnowledgeByAge', () => {
  it('returns only content starting in the next six months', () => {
    const current = makeItem({ id: 'current', minAgeMonths: 10, maxAgeMonths: 12 });
    const soon = makeItem({ id: 'soon', minAgeMonths: 15, maxAgeMonths: 24 });
    const later = makeItem({ id: 'later', minAgeMonths: 18, maxAgeMonths: 36 });

    const result = filterUpcomingKnowledgeByAge([current, soon, later], 12);
    expect(result.map((k) => k.id)).toEqual(['soon', 'later']);
  });

  it('returns nothing when no child age is available', () => {
    expect(filterUpcomingKnowledgeByAge([makeItem({ id: 'a' })], undefined)).toEqual([]);
  });
});

describe('prioritizeKnowledgeForAges', () => {
  it('prioritizes unread current content before upcoming and read content', () => {
    const readCurrent = makeItem({ id: 'read-current', minAgeMonths: 10, maxAgeMonths: 12 });
    const unreadUpcoming = makeItem({ id: 'unread-upcoming', minAgeMonths: 14, maxAgeMonths: 24 });
    const unreadCurrent = makeItem({ id: 'unread-current', minAgeMonths: 11, maxAgeMonths: 13 });

    const result = prioritizeKnowledgeForAges(
      [readCurrent, unreadUpcoming, unreadCurrent],
      [12],
      new Set(['read-current']),
    );

    expect(result.map((k) => k.id)).toEqual([
      'unread-current',
      'unread-upcoming',
      'read-current',
    ]);
  });

  it('does not fall back to all content when no children are selected', () => {
    expect(prioritizeKnowledgeForAges([makeItem({ id: 'a' })], [], new Set())).toEqual([]);
  });
});
