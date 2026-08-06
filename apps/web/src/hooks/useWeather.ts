import { useQuery } from '@tanstack/react-query';
import type { GeoPoint, WeatherSummary } from '@kodoko/domain';
import { fetchWeather } from '../lib/weather';

export function useWeather(point?: GeoPoint | null) {
  return useQuery<WeatherSummary>({
    queryKey: ['weather', point?.latitude, point?.longitude],
    queryFn: () => fetchWeather(point as GeoPoint),
    enabled: !!point,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}