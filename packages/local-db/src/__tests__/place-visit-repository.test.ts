import { describe, expect, it } from 'vitest';
import { createDatabase } from '../db';
import { localDateString, PlaceVisitRepository } from '../repositories/placeVisit';

describe('PlaceVisitRepository', () => {
  it('records manual visits and deduplicates one place per local date', async () => {
    const db = createDatabase(`kodoko-place-visits-${crypto.randomUUID()}`);
    const repo = new PlaceVisitRepository(db);

    const first = await repo.record({ placeId: 'ueno-park', visitDate: '2026-08-09' });
    const duplicate = await repo.record({ placeId: 'ueno-park', visitDate: '2026-08-09' });
    const nextDay = await repo.record({ placeId: 'ueno-park', visitDate: '2026-08-10' });

    expect(duplicate.id).toBe(first.id);
    expect(nextDay.id).not.toBe(first.id);
    expect(await repo.count()).toBe(2);
    expect(await repo.hasVisitedOn('ueno-park', '2026-08-09')).toBe(true);
    expect((await repo.latestByPlace('ueno-park'))?.visitDate).toBe('2026-08-10');

    db.close();
  });

  it('formats local dates without UTC conversion', () => {
    expect(localDateString(new Date(2026, 7, 9, 0, 30))).toBe('2026-08-09');
  });
});
