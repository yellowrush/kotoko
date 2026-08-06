import type { PolicyTaskState } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export type PolicyTaskStatus = PolicyTaskState['status'];

export class PolicyTaskRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async statusFor(childId: string | undefined, policyId: string): Promise<PolicyTaskState | undefined> {
    const entry = await this.db.policyTasks.get(policyId);
    if (!entry) return undefined;
    if (entry.childId !== childId) return undefined;
    return entry;
  }

  async listByChild(childId: string | undefined): Promise<PolicyTaskState[]> {
    const all = await this.db.policyTasks.toArray();
    return all
      .filter((task) => task.childId === childId)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async setStatus(
    childId: string | undefined,
    policyId: string,
    status: PolicyTaskStatus,
    reminderAt?: string,
  ): Promise<PolicyTaskState> {
    const updatedAt = new Date().toISOString();
    const entry: PolicyTaskState = {
      policyId,
      childId,
      status,
      reminderAt,
      updatedAt,
    };
    await this.db.policyTasks.put(entry);
    return entry;
  }
}