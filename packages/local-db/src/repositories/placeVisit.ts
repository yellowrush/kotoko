import type { PlaceVisit } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export type CreatePlaceVisitInput = {
  placeId: string;
  visitDate?: string;
};

export class PlaceVisitRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async list(): Promise<PlaceVisit[]> {
    const rows = await this.db.placeVisits.toArray();
    return rows.sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.recordedAt.localeCompare(a.recordedAt));
  }

  async listByPlace(placeId: string): Promise<PlaceVisit[]> {
    const rows = await this.db.placeVisits.where('placeId').equals(placeId).toArray();
    return rows.sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.recordedAt.localeCompare(a.recordedAt));
  }

  async latestByPlace(placeId: string): Promise<PlaceVisit | null> {
    return (await this.listByPlace(placeId))[0] ?? null;
  }

  async hasVisitedOn(placeId: string, visitDate: string = localDateString()): Promise<boolean> {
    return !!(await this.db.placeVisits.where('[placeId+visitDate]').equals([placeId, visitDate]).first());
  }

  async record(input: CreatePlaceVisitInput): Promise<PlaceVisit> {
    const visitDate = input.visitDate ?? localDateString();
    const duplicate = await this.db.placeVisits
      .where('[placeId+visitDate]')
      .equals([input.placeId, visitDate])
      .first();
    if (duplicate) return duplicate;

    const now = new Date().toISOString();
    const visit: PlaceVisit = {
      id: crypto.randomUUID(),
      placeId: input.placeId,
      visitDate,
      recordedAt: now,
      updatedAt: now,
      source: 'manual',
      schemaVersion: 1,
    };
    await this.db.placeVisits.add(visit);
    return visit;
  }

  async remove(id: string): Promise<void> {
    await this.db.placeVisits.delete(id);
  }

  async count(): Promise<number> {
    return this.db.placeVisits.count();
  }
}

export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
