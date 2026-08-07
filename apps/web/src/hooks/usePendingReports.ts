import { useEffect, useState } from 'react';
import { flushPendingReports } from '../lib/reportQueue';
import { getPendingReportRepository } from '../lib/db';

/** 页面加载时尝试补发离线排队的报告，并暴露待发数量。 */
export function usePendingReports() {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setPendingCount(await getPendingReportRepository().count());
      if (navigator.onLine) {
        setFlushing(true);
        const sent = await flushPendingReports();
        if (!cancelled) {
          setFlushing(false);
          const remaining = await getPendingReportRepository().count();
          setPendingCount(remaining);
          if (sent > 0) {
            // 补发完成后更新计数
            setPendingCount(await getPendingReportRepository().count());
          }
        }
      }
    })();

    const onOnline = () => {
      void (async () => {
        setFlushing(true);
        await flushPendingReports();
        setFlushing(false);
        setPendingCount(await getPendingReportRepository().count());
      })();
    };

    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return { pendingCount, flushing };
}