import type { PlaceComment } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export type CreatePlaceCommentInput = Omit<PlaceComment, 'id' | 'createdAt'>;

export class PlaceCommentRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async listByPlace(placeId: string): Promise<PlaceComment[]> {
    const rows = await this.db.placeComments.where('placeId').equals(placeId).toArray();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async add(input: CreatePlaceCommentInput): Promise<PlaceComment> {
    const comment: PlaceComment = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    await this.db.placeComments.add(comment);
    return comment;
  }

  async remove(id: string): Promise<void> {
    await this.db.placeComments.delete(id);
  }

  async count(): Promise<number> {
    return this.db.placeComments.count();
  }
}