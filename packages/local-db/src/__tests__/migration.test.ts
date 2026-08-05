import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { createDatabase } from '../db';

describe('schema migration v1 -> v2', () => {
  it('preserves children written under v1 when opening the current schema', async () => {
    const name = `kodoko-migration-${crypto.randomUUID()}`;

    const v1db = new Dexie(name);
    v1db.version(1).stores({ children: 'id, birthDate, updatedAt' });
    await v1db.table('children').put({
      id: 'legacy-child',
      displayName: 'れい',
      birthDate: '2021-03-03',
      interests: [],
      accessibilityNeeds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      schemaVersion: 1,
    });
    v1db.close();

    const current = createDatabase(name);
    const legacy = await current.children.get('legacy-child');
    expect(legacy).not.toBeNull();
    expect(legacy?.displayName).toBe('れい');

    const metadata = await current.metadata.get('schema');
    expect(metadata?.schemaVersion).toBe(2);

    // new tables are queryable
    await current.favorites.add({ id: 'f1', childId: 'legacy-child', placeId: 'p1', createdAt: new Date().toISOString() });
    expect(await current.favorites.count()).toBe(1);

    current.close();
  });

  it('does not silently clear data on failed write', async () => {
    const name = `kodoko-migration-${crypto.randomUUID()}`;
    const db = createDatabase(name);
    await db.children.add({
      id: 'c1',
      displayName: 'たろう',
      birthDate: '2020-01-01',
      interests: [],
      accessibilityNeeds: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      schemaVersion: 2,
    });

    await expect(
      db.transaction('rw', db.children, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await db.children.count()).toBe(1);
    db.close();
  });
});