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
    const pick = <K extends keyof Omit<UserPreference, 'id' | 'updatedAt'>>(
      key: K,
      fallback: UserPreference[K],
    ): UserPreference[K] =>
      Object.prototype.hasOwnProperty.call(input, key)
        ? (input[key] as UserPreference[K])
        : fallback;
    const merged: UserPreference = {
      id: DEFAULT_PREFERENCE_ID,
      locale: pick('locale', existing?.locale ?? 'ja'),
      municipalityCode: pick('municipalityCode', existing?.municipalityCode),
      radiusKm: pick('radiusKm', existing?.radiusKm),
      indoorOutdoorPreference: pick(
        'indoorOutdoorPreference',
        existing?.indoorOutdoorPreference,
      ),
      updatedAt: now,
    };
    await this.db.preferences.put(merged);
    return merged;
  }

  async clear(): Promise<void> {
    await this.db.preferences.delete(DEFAULT_PREFERENCE_ID);
  }
}
