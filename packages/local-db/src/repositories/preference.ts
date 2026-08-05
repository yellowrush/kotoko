import type { UserPreference } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export const DEFAULT_PREFERENCE_ID = 'default';

export class PreferenceRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async get(): Promise<UserPreference | null> {
    return (await this.db.preferences.get(DEFAULT_PREFERENCE_ID)) ?? null;
  }

  async set(input: Partial<Omit<UserPreference, 'id' | 'updatedAt'>>): Promise<UserPreference> {
    const now = new Date().toISOString();
    const existing = await this.get();
    const merged: UserPreference = {
      id: DEFAULT_PREFERENCE_ID,
      locale: input.locale ?? existing?.locale ?? 'ja',
      municipalityCode: input.municipalityCode ?? existing?.municipalityCode,
      radiusKm: input.radiusKm ?? existing?.radiusKm,
      indoorOutdoorPreference: input.indoorOutdoorPreference ?? existing?.indoorOutdoorPreference,
      updatedAt: now,
    };
    await this.db.preferences.put(merged);
    return merged;
  }

  async clear(): Promise<void> {
    await this.db.preferences.delete(DEFAULT_PREFERENCE_ID);
  }
}