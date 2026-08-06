import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '@kodoko/domain';

export type GeolocationStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable';

type UseGeolocationResult = {
  status: GeolocationStatus;
  coords: GeoPoint | null;
  requested: boolean;
  request: () => void;
};

export const DEFAULT_CENTER: GeoPoint = { latitude: 35.6812, longitude: 139.7671 };

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [requested, setRequested] = useState(false);
  const requestedRef = useRef(false);

  const request = useCallback(() => {
    requestedRef.current = true;
    setRequested(true);

    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }

    setStatus('prompting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: GeoPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(point);
        setStatus('granted');
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  // 初次打開地圖頁即請求定位，使地圖自動以當前位置為中心。
  // 瀏覽器會彈出授權提示，屬用戶明確授權；拒絕後不再重複觸發。
  useEffect(() => {
    if (requestedRef.current) return;
    request();
  }, [request]);

  return { status, coords, requested, request };
}