import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchContentVersion } from '@kodoko/api-client';
import { getApiClient } from '../lib/api';
import { invalidatePublicContentQueries } from './publicContentQueries';

const CONTENT_VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function PublicContentRefresh() {
  const queryClient = useQueryClient();
  const latestSignatureRef = useRef<string | null>(null);
  const checkingRef = useRef(false);

  const checkVersion = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const version = await fetchContentVersion(getApiClient());
      const previousSignature = latestSignatureRef.current;
      latestSignatureRef.current = version.signature;

      if (previousSignature && previousSignature !== version.signature) {
        await invalidatePublicContentQueries(queryClient);
      }
    } catch {
      // Public content queries keep their own online/offline fallback behavior.
    } finally {
      checkingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    void checkVersion();

    const intervalId = window.setInterval(() => {
      void checkVersion();
    }, CONTENT_VERSION_CHECK_INTERVAL_MS);

    const handleFocus = () => {
      void checkVersion();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion]);

  return null;
}
