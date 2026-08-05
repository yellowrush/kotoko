import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type KodokoLocalDatabase } from '../db';
import { DexieChildRepository } from '../repositories/child';

describe('DexieChildRepository', () => {
  let db: KodokoLocalDatabase;
  let repo: DexieChildRepository;

  beforeEach(async () => {
    db = createDatabase(`kodoko-test-${crypto.randomUUID()}`);
    repo = new DexieChildRepository(db);
  });

  it('creates and lists children', async () => {
    const created = await repo.create({ displayName: 'はな', birthDate: '2023-04-01' });
    const list = await repo.list();

    expect(created.id).toBeTruthy();
    expect(list).toHaveLength(1);
    expect(list[0]?.displayName).toBe('はな');
  });

  it('gets a child by id', async () => {
    const created = await repo.create({ displayName: 'たろう', birthDate: '2022-01-15' });
    const found = await repo.getById(created.id);
    expect(found?.birthDate).toBe('2022-01-15');
  });

  it('updates a child preserving updatedAt', async () => {
    const created = await repo.create({ displayName: 'A', birthDate: '2023-01-01' });
    const updated = await repo.update(created.id, { displayName: 'B', interests: ['電車'] });

    expect(updated.displayName).toBe('B');
    expect(updated.interests).toEqual(['電車']);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);

    const persisted = await repo.getById(created.id);
    expect(persisted?.displayName).toBe('B');
  });

  it('removes a child', async () => {
    const created = await repo.create({ displayName: 'A', birthDate: '2023-01-01' });
    await repo.remove(created.id);
    expect(await repo.getById(created.id)).toBeNull();
  });

  it('throws when updating unknown id', async () => {
    await expect(repo.update('missing', { displayName: 'X' })).rejects.toThrow();
  });
});