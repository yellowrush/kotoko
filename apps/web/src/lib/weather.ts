import type { GeoPoint, WeatherSummary } from '@kodoko/domain';

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const STORM_CODES = new Set([95, 96, 99]);

export function wmoToCondition(code: number | undefined): WeatherSummary['condition'] {
  if (code === undefined) return 'unknown';
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'cloudy';
  if (RAIN_CODES.has(code)) return 'rain';
  if (SNOW_CODES.has(code)) return 'snow';
  if (STORM_CODES.has(code)) return 'storm';
  return 'unknown';
}

const WEATHER_URL =
  import.meta.env.VITE_WEATHER_API_URL ?? 'https://api.open-meteo.com/v1/forecast';

// 隱私：只傳降精度座標（約 1km）到天氣服務，且不持久化。
export async function fetchWeather(point: GeoPoint): Promise<WeatherSummary> {
  const lat = point.latitude.toFixed(2);
  const lng = point.longitude.toFixed(2);
  const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`weather request failed with ${res.status}`);
  }
  const data = (await res.json()) as {
    current_weather?: { weathercode?: number; temperature?: number };
  };
  return {
    condition: wmoToCondition(data.current_weather?.weathercode),
    temperatureCelsius: data.current_weather?.temperature,
  };
}