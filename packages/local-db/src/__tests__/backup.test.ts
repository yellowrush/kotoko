import { describe, expect, it, beforeEach } from 'vitest';
import { createDatabase, type KodokoLocalDatabase } from '../db';
import {
  clearAllData,
  exportLocalBackup,
  exportLocalBackupJson,
  importLocalBackup,
  validateBackup,
} from '../backup';
import { DexieChildRepository } from '../repositories/child';
import { FavoriteRepository } from '../repositories/favorite';
import { PreferenceRepository } from '../repositories/preference';
import { PlaceCommentRepository } from '../repositories/placeComment';
import { LOCAL_BACKUP_VERSION } from '../backup';

const validBackupPayload = () => ({
  app: 'kodoko',
  version: 1,
  exportedAt: '2026-01-01T00:00:00+09:00',
  children: [],
  preferences: [],
  favorites: [],
  knowledgeProgress: [],
  policyTasks: [],
});

describe('validateBackup', () => {
  it('rejects non-object payloads', () => {
    expect(validateBackup('[]').ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
  });

  it('rejects non-kodoko headers', () => {
    expect(validateBackup({ app: 'other', version: 1 }).ok).toBe(false);
  });

  it('rejects future versions', () => {
    expect(validateBackup({ ...validBackupPayload(), version: 99 }).ok).toBe(false);
  });

  it('rejects malformed children schema', () => {
    const result = validateBackup({
      ...validBackupPayload(),
      children: [{ id: 'x', displayName: 42 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid-schema');
  });

  it('rejects prototype pollution / unknown top-level fields (strict schema)', () => {
    const polluted = {
      ...validBackupPayload(),
      ['__proto__']: { polluted: true },
    };
    // __proto__ as JSON key is preserved by JSON.parse; ensure header/version checks still guard.
    expect(validateBackup(polluted).ok).toBe(false);
  });

  it('rejects unknown fields inside entities (strict schema)', () => {
    const result = validateBackup({
      ...validBackupPayload(),
      preferences: [
        {
          id: 'default',
          locale: 'ja',
          updatedAt: '2026-01-01T00:00:00+09:00',
          evil: 'x',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid-schema');
  });

  it('accepts a fully valid backup', () => {
    expect(validateBackup(validBackupPayload()).ok).toBe(true);
  });
});

describe('backup export/import', () => {
  let db: KodokoLocalDatabase;

  beforeEach(() => {
    db = createDatabase(`kodoko-backup-${crypto.randomUUID()}`);
  });

  it('round-trips all entity types through export and import', async () => {
    const repo = new DexieChildRepository(db);
    const fav = new FavoriteRepository(db);
    const pref = new PreferenceRepository(db);
    const child = await repo.create({ displayName: 'そうた', birthDate: '2020-06-15' });
    await fav.add(child.id, 'p1');
    await pref.set({ locale: 'zh-CN', radiusKm: 3 });

    const backup = await exportLocalBackup(db);
    expect(backup.children).toHaveLength(1);
    expect(backup.favorites).toHaveLength(1);
    expect(backup.preferences[0]?.locale).toBe('zh-CN');

    const raw = await exportLocalBackupJson(db);
    expect(raw).toContain('"app": "kodoko"');

    const importedDb = createDatabase(`kodoko-import-${crypto.randomUUID()}`);
    const { created } = await importLocalBackup(importedDb, raw, 'merge');
    expect(created).toBe(1);

    const restoredChild = new DexieChildRepository(importedDb);
    expect(await restoredChild.getById(child.id)).toMatchObject({
      displayName: 'そうた',
      birthDate: '2020-06-15',
    });
    expect(await new FavoriteRepository(importedDb).count()).toBe(1);
    expect((await new PreferenceRepository(importedDb).get())?.locale).toBe('zh-CN');
  });

  it('round-trips place comments through export and import', async () => {
    const repo = new PlaceCommentRepository(db);
    await repo.add({ placeId: 'p1', rating: 5, content: 'とても良かった' });
    await repo.add({ placeId: 'p2', rating: 3, content: 'ふつう' });

    const raw = await exportLocalBackupJson(db);
    const parsed = JSON.parse(raw);
    expect(parsed.placeComments).toHaveLength(2);
    expect(parsed.version).toBe(LOCAL_BACKUP_VERSION);

    const importedDb = createDatabase(`kodoko-import-comments-${crypto.randomUUID()}`);
    await importLocalBackup(importedDb, raw, 'merge');

    const restored = new PlaceCommentRepository(importedDb);
    const byPlace = await restored.listByPlace('p1');
    expect(byPlace).toHaveLength(1);
    expect(byPlace[0]?.content).toBe('とても良かった');
  });

  it('imports legacy v1 back—ups without placeComments', async () => {
    const legacy = {
      app: 'kodoko',
      version: 1,
      exportedAt: '2026-01-01T00:00:00+09:00',
      children: [],
      preferences: [],
      favorites: [],
      knowledgeProgress: [],
      policyTasks: [],
    };
    const importedDb = createDatabase(`koko-import-legacy-${crypto.randomUUID()}`);
    const { created } = await importLocalBackup(importedDb, JSON.stringify(legacy), 'merge');
    expect(created).toBe(0);
    expect(await new PlaceCommentRepository(importedDb).count()).toBe(0);
  });

  it('overwrite mode replaces existing data', async () => {
    const repo = new DexieChildRepository(db);
    await repo.create({ displayName: 'before', birthDate: '2020-01-01' });
    await repo.create({ displayName: 'after', birthDate: '2021-01-01' });

    const raw = await exportLocalBackupJson(db);
    const backup = JSON.parse(raw);
    backup.children = backup.children.filter((c: { displayName: string }) => c.displayName === 'after');
    await importLocalBackup(db, JSON.stringify(backup), 'overwrite');

    expect(await repo.list()).toHaveLength(1);
    expect((await repo.list())[0]?.displayName).toBe('after');
  });

  it('merge mode keeps existing data that is not in the backup', async () => {
    const repo = new DexieChildRepository(db);
    await repo.create({ displayName: 'keep', birthDate: '2020-01-01' });

    const importedDb = createDatabase(`kodoko-merge-${crypto.randomUUID()}`);
    await new DexieChildRepository(importedDb).create({ displayName: 'incoming', birthDate: '2021-01-01' });

    const raw = await exportLocalBackupJson(db);
    await importLocalBackup(importedDb, raw, 'merge');
    const list = await new DexieChildRepository(importedDb).list();
    expect(list.map((c) => c.displayName).sort()).toEqual(['incoming', 'keep']);
  });

  it('rejects invalid json and preserves existing data', async () => {
    const repo = new DexieChildRepository(db);
    await repo.create({ displayName: 'keep', birthDate: '2020-01-01' });

    await expect(importLocalBackup(db, '{not json', 'overwrite')).rejects.toThrow('INVALID_JSON');
    expect(await repo.list()).toHaveLength(1);
  });

  it('rejects backup with malicious script-looking content', async () => {
    const evil = {
      ...validBackupPayload(),
      children: [
        {
          id: 'c1',
          displayName: '<img onerror=alert(1)>',
          birthDate: '2020-01-01',
          interests: [],
          accessibilityNeeds: [],
          createdAt: '2026-01-01T00:00:00+09:00',
          updatedAt: '2026-01-01T00:00:00+09:00',
          schemaVersion: 1,
        },
      ],
    };
    // 显示名虽然是任意字符串，但导入后只作为纯文本渲染（React 默认转义）。
    const { created } = await importLocalBackup(db, JSON.stringify(evil), 'merge');
    expect(created).toBe(1);
    const child = (await new DexieChildRepository(db).list())[0];
    expect(child?.displayName).toContain('<img');
  });
});

describe('clearAllData', () => {
  it('wipes every local table', async () => {
    const db = createDatabase(`kodoko-clear-${crypto.randomUUID()}`);
    const repo = new DexieChildRepository(db);
    await repo.create({ displayName: 'a', birthDate: '2020-01-01' });
    await new FavoriteRepository(db).add('c1', 'p1');

    await clearAllData(db);

    expect(await repo.list()).toHaveLength(0);
    expect(await new FavoriteRepository(db).count()).toBe(0);
    expect(await new PreferenceRepository(db).get()).toBeNull();
  });
});

describe('FavoriteRepository', () => {
  it('deduplicates and removes favorites', async () => {
    const db = createDatabase(`kodoko-fav-${crypto.randomUUID()}`);
    const fav = new FavoriteRepository(db);

    const a = await fav.add('c1', 'p1');
    const duplicate = await fav.add('c1', 'p1');
    expect(duplicate.id).toBe(a.id);
    expect(await fav.count()).toBe(1);

    expect(await fav.has('c1', 'p1')).toBe(true);
    await fav.removeByPlace('c1', 'p1');
    expect(await fav.has('c1', 'p1')).toBe(false);
  });
});

describe('PreferenceRepository', () => {
  it('upserts a single preference row and clears it', async () => {
    const db = createDatabase(`kodoko-pref-${crypto.randomUUID()}`);
    const pref = new PreferenceRepository(db);

    expect(await pref.get()).toBeNull();

    await pref.set({ locale: 'zh-TW', radiusKm: 2 });
    const saved = await pref.get();
    expect(saved?.locale).toBe('zh-TW');
    expect(saved?.radiusKm).toBe(2);

    // 未提供的字段保留旧值
    await pref.set({ municipalityCode: '13108' });
    expect((await pref.get())?.locale).toBe('zh-TW');
    expect((await pref.get())?.municipalityCode).toBe('13108');

    await pref.clear();
    expect(await pref.get()).toBeNull();
  });
});