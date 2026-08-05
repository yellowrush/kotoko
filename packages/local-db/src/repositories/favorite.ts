import type { FavoritePlace } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export class FavoriteRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async listByChild(childId?: string): Promise<FavoritePlace[]> {
    if (!childId) return this.db.favorites.toArray();
    const byChild = await this.db.favorites.where('childId').equals(childId).toArray();
    return byChild;
  }

  async has(childId: string | undefined, placeId: string): Promise<boolean> {
    const existing = await this.db.favorites.where('placeId').equals(placeId).first();
    return !!existing && existing.childId === childId;
  }

  async add(childId: string | undefined, placeId: string): Promise<FavoritePlace> {
    const duplicate = await this.db.favorites
      .where('childId')
      .equals(childId ?? '')
      .and((f) => f.placeId === placeId)
      .first();
    if (duplicate) return duplicate;

    const favorite: FavoritePlace = {
      id: crypto.randomUUID(),
      childId,
      placeId,
      createdAt: new Date().toISOString(),
    };
    await this.db.favorites.add(favorite);
    return favorite;
  }

  async remove(id: string): Promise<void> {
    await this.db.favorites.delete(id);
  }

  async removeByPlace(childId: string | undefined, placeId: string): Promise<void> {
    const favorite = await this.db.favorites
      .where('childId')
      .equals(childId ?? '')
      .and((f) => f.placeId === placeId)
      .first();
    if (favorite) await this.db.favorites.delete(favorite.id);
  }

  async count(): Promise<number> {
    return this.db.favorites.count();
  }
}