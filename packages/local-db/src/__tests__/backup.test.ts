import { describe, expect, it, beforeEach } from 'vitest';
import { createDatabase, type KodokoLocalDatabase } from '../db';
import { exportLocalBackup, importLocalBackup, validateBackup } from '../backup';
import { DexieChildRepository } from '../repositories/child';

describe('validateBackup', () => {
  it('rejects non-object payloads', () => {
    expect(validateBackup('[]').ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
  });

  it('rejects non-kodoko headers', () => {
    expect(validateBackup({ app: 'other', version: 1 }).ok).toBe(false);
  });

  it('rejects future versions', () => {
    expect(validateBackup({ app: 'kodoko', version: 99, exportedAt: '', children: [] }).ok).toBe(false);
  });

  it('rejects malformed children schema', () => {
    const result = validateBackup({
      app: 'kodoko',
      version: 1,
      exportedAt: '2026-01-01T00:00:00+09:00',
      children: [{ id: 'x', displayName: 42 }],
      preferences: [],
      favorites: [],
      knowledgeProgress: [],
      policyTasks: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid-schema');
  });
});

describe('backup export/import', () => {
  let db: KodokoLocalDatabase;

  beforeEach(() => {
    db = createDatabase(`kodoko-backup-${crypto.randomUUID()}`);
  });

  it('round-trips children through export and import', async () => {
    const repo = new DexieChildRepository(db);
    const child = await repo.create({ displayName: 'そうた', birthDate: '2020-06-15' });

    const raw = await exportLocalBackup(db);
    expect(raw).toContain('"app": "kodoko"');

    const importedDb = createDatabase(`kodoko-import-${crypto.randomUUID()}`);
    const { created } = await importLocalBackup(importedDb, raw, 'merge');
    expect(created).toBe(1);

    const restored = new DexieChildRepository(importedDb);
    expect(await restored.getById(child.id)).toMatchObject({
      displayName: 'そうた',
      birthDate: '2020-06-15',
    });
  });

  it('overwrite mode replaces existing data', async () => {
    const repo = new DexieChildRepository(db);
    await repo.create({ displayName: 'before', birthDate: '2020-01-01' });
    await repo.create({ displayName: 'after', birthDate: '2021-01-01' });

    const raw = await exportLocalBackup(db);
    // drop the 'before' child to simulate an older backup
    const backup = JSON.parse(raw);
    backup.children = backup.children.filter((c: { displayName: string }) => c.displayName === 'after');
    await importLocalBackup(db, JSON.stringify(backup), 'overwrite');

    expect(await repo.list()).toHaveLength(1);
    expect((await repo.list())[0]?.displayName).toBe('after');
  });

  it('rejects invalid json and preserves existing data', async () => {
    const repo = new DexieChildRepository(db);
    await repo.create({ displayName: 'keep', birthDate: '2020-01-01' });

    await expect(importLocalBackup(db, '{not json', 'overwrite')).rejects.toThrow('INVALID_JSON');
    expect(await repo.list()).toHaveLength(1);
  });
});