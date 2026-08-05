import type { ChildProfile, CreateChildInput, ChildRepository, UpdateChildInput } from '@kodoko/domain';
import { newChildProfile } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export class DexieChildRepository implements ChildRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async list(): Promise<ChildProfile[]> {
    return this.db.children.orderBy('createdAt').toArray();
  }

  async getById(id: string): Promise<ChildProfile | null> {
    return (await this.db.children.get(id)) ?? null;
  }

  async create(input: CreateChildInput): Promise<ChildProfile> {
    const profile = newChildProfile(input);
    await this.db.children.add(profile);
    return profile;
  }

  async update(id: string, input: UpdateChildInput): Promise<ChildProfile> {
    const existing = await this.db.children.get(id);
    if (!existing) throw new Error(`ChildProfile not found: ${id}`);
    const updated: ChildProfile = {
      ...existing,
      ...input,
      interests: input.interests ?? existing.interests,
      accessibilityNeeds: input.accessibilityNeeds ?? existing.accessibilityNeeds,
      updatedAt: new Date().toISOString(),
    };
    await this.db.children.put(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.db.children.delete(id);
  }
}