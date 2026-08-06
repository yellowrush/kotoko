import type { KnowledgeProgress } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export class KnowledgeProgressRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async listByChild(childId?: string): Promise<KnowledgeProgress[]> {
    if (!childId) return this.db.knowledgeProgress.toArray();
    return this.db.knowledgeProgress.where('childId').equals(childId).toArray();
  }

  async statusFor(childId: string | undefined, knowledgeId: string): Promise<KnowledgeProgress | null> {
    const entry = await this.db.knowledgeProgress
      .where('childId')
      .equals(childId ?? '')
      .and((k) => k.knowledgeId === knowledgeId)
      .first();
    return entry ?? null;
  }

  async markRead(childId: string | undefined, knowledgeId: string): Promise<KnowledgeProgress> {
    const existing = await this.statusFor(childId, knowledgeId);
    const now = new Date().toISOString();
    if (existing) {
      const updated: KnowledgeProgress = {
        ...existing,
        status: 'read',
        readAt: existing.readAt ?? now,
        updatedAt: now,
      };
      await this.db.knowledgeProgress.put(updated);
      return updated;
    }
    const created: KnowledgeProgress = {
      id: crypto.randomUUID(),
      childId,
      knowledgeId,
      status: 'read',
      readAt: now,
      updatedAt: now,
    };
    await this.db.knowledgeProgress.add(created);
    return created;
  }

  async count(): Promise<number> {
    return this.db.knowledgeProgress.count();
  }
}