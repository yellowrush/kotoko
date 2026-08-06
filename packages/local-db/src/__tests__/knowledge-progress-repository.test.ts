import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type KodokoLocalDatabase } from '../db';
import { KnowledgeProgressRepository } from '../repositories/knowledgeProgress';

describe('KnowledgeProgressRepository', () => {
  let db: KodokoLocalDatabase;
  let repo: KnowledgeProgressRepository;

  beforeEach(async () => {
    db = createDatabase(`kodoko-test-${crypto.randomUUID()}`);
    repo = new KnowledgeProgressRepository(db);
  });

  it('starts with no progress', async () => {
    expect(await repo.listByChild('c1')).toEqual([]);
    expect(await repo.statusFor('c1', 'k1')).toBeNull();
  });

  it('marks knowledge as read with a timestamp', async () => {
    const entry = await repo.markRead('c1', 'k-vaccination');
    expect(entry.status).toBe('read');
    expect(entry.readAt).toBeTruthy();
    expect(entry.childId).toBe('c1');
    expect(await repo.statusFor('c1', 'k-vaccination')).toMatchObject({
      status: 'read',
      knowledgeId: 'k-vaccination',
    });
  });

  it('keeps the original readAt on subsequent marks', async () => {
    const first = await repo.markRead('c1', 'k1');
    const second = await repo.markRead('c1', 'k1');
    expect(second.readAt).toBe(first.readAt);
  });

  it('scopes progress by child', async () => {
    await repo.markRead('c1', 'k1');
    await repo.markRead('c2', 'k2');
    expect((await repo.listByChild('c1')).map((k) => k.knowledgeId)).toEqual(['k1']);
    expect((await repo.listByChild('c2')).map((k) => k.knowledgeId)).toEqual(['k2']);
  });

  it('supports events without a child id', async () => {
    const entry = await repo.markRead(undefined, 'k3');
    expect(entry.status).toBe('read');
    expect((await repo.listByChild(undefined)).map((k) => k.knowledgeId)).toEqual(['k3']);
  });
});