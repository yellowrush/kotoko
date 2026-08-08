import type { PolicyTaskState } from '@kodoko/domain';
import { policyTaskEntryId, type KodokoLocalDatabase } from '../db';

export type PolicyTaskStatus = PolicyTaskState['status'];

export class PolicyTaskRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async statusFor(childId: string | undefined, policyId: string): Promise<PolicyTaskState | undefined> {
    if (!childId) return undefined;
    return this.db.policyTaskEntries.where('[childId+policyId]').equals([childId, policyId]).first();
  }

  async listByChild(childId: string | undefined): Promise<PolicyTaskState[]> {
    if (!childId) return [];
    return this.listByChildren([childId]);
  }

  async listByChildren(childIds: string[]): Promise<PolicyTaskState[]> {
    if (childIds.length === 0) return [];
    const uniqueChildIds = [...new Set(childIds)];
    const list = await this.db.policyTaskEntries.where('childId').anyOf(uniqueChildIds).toArray();
    return list.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
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
    if (childId) {
      await this.db.policyTaskEntries.put({
        ...entry,
        id: policyTaskEntryId(childId, policyId),
      });
    }
    return entry;
  }
}
