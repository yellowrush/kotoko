import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type KodokoLocalDatabase } from '../db';
import { PolicyTaskRepository } from '../repositories/policyTask';

describe('PolicyTaskRepository', () => {
  let db: KodokoLocalDatabase;
  let repo: PolicyTaskRepository;

  beforeEach(async () => {
    db = createDatabase(`kodoko-test-${crypto.randomUUID()}`);
    repo = new PolicyTaskRepository(db);
  });

  it('starts with no tasks', async () => {
    expect(await repo.listByChild('c1')).toEqual([]);
    expect(await repo.statusFor('c1', 'p1')).toBeUndefined();
  });

  it('sets a status and stores the timestamp', async () => {
    const task = await repo.setStatus('c1', 'p-child-allowance', 'planned');
    expect(task.status).toBe('planned');
    expect(task.updatedAt).toBeTruthy();
    expect((await repo.statusFor('c1', 'p-child-allowance'))?.status).toBe('planned');
  });

  it('overwrites an existing status', async () => {
    await repo.setStatus('c1', 'p1', 'planned');
    await repo.setStatus('c1', 'p1', 'completed');
    expect((await repo.statusFor('c1', 'p1'))?.status).toBe('completed');
  });

  it('scopes tasks by child', async () => {
    await repo.setStatus('c1', 'p1', 'planned');
    await repo.setStatus('c2', 'p2', 'completed');
    expect((await repo.listByChild('c1')).map((t) => t.policyId)).toEqual(['p1']);
    expect((await repo.listByChild('c2')).map((t) => t.policyId)).toEqual(['p2']);
  });

  it('returns undefined when the same policy belongs to another child', async () => {
    await repo.setStatus('c1', 'p1', 'planned');
    expect(await repo.statusFor('c2', 'p1')).toBeUndefined();
  });
});