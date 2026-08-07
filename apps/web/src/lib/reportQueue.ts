import type { PendingPlaceReport, PlaceReportType } from '@kodoko/domain';
import { submitPlaceReport } from '@kodoko/api-client';
import { getApiClient } from './api';
import { getPendingReportRepository } from './db';

export type ReportInput = {
  placeId: string;
  type: PlaceReportType;
  detail?: string;
  contactEmail?: string;
};

/**
 * 提交地点纠错报告。离线或网络失败时保存到本地 pendingReports 队列，
 * 恢复网络后由 flushPendingReports 自动补发。
 */
export async function submitReportWithQueue(input: ReportInput): Promise<{
  queued: boolean;
}> {
  try {
    await submitPlaceReport(getApiClient(), input.placeId, {
      type: input.type,
      detail: input.detail,
      contactEmail: input.contactEmail,
    });
    return { queued: false };
  } catch {
    await getPendingReportRepository().add({
      placeId: input.placeId,
      type: input.type,
      detail: input.detail,
      contactEmail: input.contactEmail,
    });
    return { queued: true };
  }
}

/** 尝试把本地排队的报告补发到服务器，成功即删除。 */
export async function flushPendingReports(): Promise<number> {
  const repo = getPendingReportRepository();
  const pending = await repo.list();
  let sent = 0;

  for (const report of pending) {
    try {
      await submitPlaceReport(getApiClient(), report.placeId, {
        type: report.type,
        detail: report.detail,
        contactEmail: report.contactEmail,
      });
      await repo.remove(report.id);
      sent += 1;
    } catch {
      // 仍离线或服务器不可用，保留队列等待下次。
    }
  }

  return sent;
}

export type { PendingPlaceReport };
