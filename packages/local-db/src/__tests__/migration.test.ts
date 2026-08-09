import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { createDatabase } from '../db';

describe('schema migration v1 -> v5', () => {
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
    expect(metadata?.schemaVersion).toBe(5);

    // new tables are queryable
    await current.favorites.add({ id: 'f1', childId: 'legacy-child', placeId: 'p1', createdAt: new Date().toISOString() });
    await current.placeComments.add({
      id: 'c1',
      placeId: 'p1',
      rating: 5,
      content: '楽しかった',
      createdAt: new Date().toISOString(),
    });
    expect(await current.favorites.count()).toBe(1);
    expect(await current.placeComments.count()).toBe(1);
    await current.placeVisits.add({
      id: 'v1',
      placeId: 'p1',
      visitDate: '2026-08-09',
      recordedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
      schemaVersion: 1,
    });
    expect(await current.placeVisits.count()).toBe(1);

    current.close();
  });

  it('migrates v2 data into v5 preserving values', async () => {
    const name = `kodoko-migration-v2-${crypto.randomUUID()}`;

    const v2db = new Dexie(name);
    v2db.version(1).stores({ children: 'id, birthDate, createdAt, updatedAt' });
    v2db.version(2).stores({
      children: 'id, birthDate, createdAt, updatedAt',
      preferences: 'id, updatedAt',
      favorites: 'id, childId, placeId, [childId+placeId]',
      knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
      policyTasks: 'policyId, status, updatedAt',
      metadata: 'id',
    });
    await v2db.table('favorites').put({ id: 'f-v2', childId: 'c1', placeId: 'p9', createdAt: '2025-01-01T00:00:00.000Z' });
    v2db.close();

    const current = createDatabase(name);
    expect(await current.favorites.count()).toBe(1);
    expect((await current.favorites.get('f-v2'))?.placeId).toBe('p9');
    expect((await current.metadata.get('schema'))?.schemaVersion).toBe(5);
    // new v3 tables are empty & writable
    await current.placeComments.add({
      id: 'c9',
      placeId: 'p9',
      rating: 4,
      content: '楽しかった',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    expect(await current.placeComments.count()).toBe(1);
    await current.placeVisits.add({
      id: 'v9',
      placeId: 'p9',
      visitDate: '2026-08-09',
      recordedAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
      source: 'manual',
      schemaVersion: 1,
    });
    expect(await current.placeVisits.count()).toBe(1);
    current.close();
  });

  it('migrates v3 policy tasks into v5 and allows the same policy for another child', async () => {
    const name = `kodoko-migration-v3-policy-${crypto.randomUUID()}`;

    const v3db = new Dexie(name);
    v3db.version(1).stores({ children: 'id, birthDate, createdAt, updatedAt' });
    v3db.version(2).stores({
      children: 'id, birthDate, createdAt, updatedAt',
      preferences: 'id, updatedAt',
      favorites: 'id, childId, placeId, [childId+placeId]',
      knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
      policyTasks: 'policyId, status, updatedAt',
      metadata: 'id',
    });
    v3db.version(3).stores({
      children: 'id, birthDate, createdAt, updatedAt',
      preferences: 'id, updatedAt',
      favorites: 'id, childId, placeId, [childId+placeId]',
      knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
      policyTasks: 'policyId, status, updatedAt',
      placeComments: 'id, placeId, createdAt',
      pendingReports: 'id, placeId, createdAt',
      metadata: 'id',
    });
    await v3db.table('policyTasks').put({
      policyId: 'p-child-allowance',
      childId: 'c1',
      status: 'planned',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    v3db.close();

    const current = createDatabase(name);
    const legacyTask = await current.policyTaskEntries
      .where('[childId+policyId]')
      .equals(['c1', 'p-child-allowance'])
      .first();
    expect(legacyTask?.status).toBe('planned');
    await current.policyTaskEntries.put({
      id: 'c2:p-child-allowance',
      childId: 'c2',
      policyId: 'p-child-allowance',
      status: 'completed',
      updatedAt: '2025-01-02T00:00:00.000Z',
    });
    expect(await current.policyTaskEntries.count()).toBe(2);
    expect((await current.metadata.get('schema'))?.schemaVersion).toBe(5);
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
