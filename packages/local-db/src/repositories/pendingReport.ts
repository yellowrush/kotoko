import type { PendingPlaceReport } from '@kodoko/domain';
import type { KodokoLocalDatabase } from '../db';

export type CreatePendingReportInput = Omit<PendingPlaceReport, 'id' | 'createdAt'>;

export class PendingReportRepository {
  constructor(private readonly db: KodokoLocalDatabase) {}

  async list(): Promise<PendingPlaceReport[]> {
    return this.db.pendingReports.orderBy('createdAt').toArray();
  }

  async add(input: CreatePendingReportInput): Promise<PendingPlaceReport> {
    const report: PendingPlaceReport = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    await this.db.pendingReports.add(report);
    return report;
  }

  async remove(id: string): Promise<void> {
    await this.db.pendingReports.delete(id);
  }

  async count(): Promise<number> {
    return this.db.pendingReports.count();
  }
}