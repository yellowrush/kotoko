import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import type { WeatherSummary } from '@kodoko/domain';
import { useActiveChild } from '../hooks/useActiveChild';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { recommendForChild } from '../lib/recommendations';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { AgeLabel } from '../components/AgeLabel';
import { PageHeader } from '../components/PageHeader';
import { CATEGORY_ICON } from '../components/places/categoryMeta';

const WEATHER_OPTIONS: { value: WeatherSummary | undefined; key: string }[] = [
  { value: undefined, key: 'home.weatherNone' },
  { value: { condition: 'rain' }, key: 'home.weatherRain' },
  { value: { condition: 'snow' }, key: 'home.weatherSnow' },
  { value: { condition: 'storm' }, key: 'home.weatherStorm' },
];

function weatherActive(selected: WeatherSummary | undefined, option: WeatherSummary | undefined): boolean {
  if (option === undefined) return selected === undefined;
  return selected !== undefined && selected.condition === option.condition;
}

export function HomePage() {
  const { t } = useTranslation();
  const { children, active, setActive, loading: childLoading } = useActiveChild();
  const { data: places, isLoading: placesLoading, isError, refetch } = usePlaces();
  const { coords } = useGeolocation();
  const [weather, setWeather] = useState<WeatherSummary | undefined>();

  const recommendations = useMemo(
    () =>
      recommendForChild({
        child: active,
        places: places ?? [],
        userLocation: coords ?? undefined,
        weather,
      }),
    [active, places, coords, weather],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('home.title')} />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">{t('home.recommendationsTitle')}</h2>
          <Link to="/places" className="text-xs font-medium text-brand-700">
            {t('home.allPlaces')}
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-gray-500">
          <span>{t('home.weather')}</span>
          {WEATHER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWeather(option.value)}
              className={`rounded-full border px-2 py-0.5 ${
                weatherActive(weather, option.value)
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-gray-300 bg-white text-gray-600'
              }`}
            >
              {t(option.key)}
            </button>
          ))}
        </div>

        {placesLoading && !isError && <p className="mt-2 text-sm text-gray-400">{t('loading')}</p>}

        {isError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <p>{t('common.error')}</p>
            <button type="button" onClick={() => void refetch()} className="text-brand-700">
              {t('common.retry')}
            </button>
          </div>
        )}

        {!isError && !active && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">{t('home.noChildYet')}</p>
            <Link to="/children/new" className="text-sm font-medium text-brand-700">
              {t('home.addChild')}
            </Link>
          </div>
        )}

        {!isError && active && !placesLoading && recommendations.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">{t('home.noRecommendations')}</p>
        )}

        {!isError &&
          recommendations.map((r, index) => (
            <Link
              key={r.place.id}
              to={`/places/${r.place.id}`}
              className="mt-2 flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2 hover:bg-gray-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="shrink-0 text-lg">{CATEGORY_ICON[r.place.category]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.place.name}</span>
                <RecommendationReasons reasonCodes={r.reasonCodes} distanceKm={r.distanceKm} />
              </span>
              <span className="shrink-0 text-xs text-gray-500">
                {t('home.score')} {r.score}
              </span>
            </Link>
          ))}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">{t('home.currentChild')}</h2>
          {!childLoading && children.length > 1 && (
            <label className="flex items-center gap-1 text-xs text-gray-500">
              {t('home.switchChild')}
              <select
                value={active?.id ?? ''}
                onChange={(e) => setActive(e.target.value)}
                className="rounded border border-gray-300 px-1 py-0.5 text-xs"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {childLoading ? (
          <p className="mt-2 text-sm text-gray-400">{t('loading')}</p>
        ) : active ? (
          <div className="mt-2">
            <p className="text-base font-medium">{active.displayName}</p>
            <p className="text-sm text-gray-500">
              <AgeLabel birthDate={active.birthDate} />
            </p>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">{t('home.noChildYet')}</p>
            <Link to="/children/new" className="text-sm font-medium text-brand-700">
              {t('home.addChild')}
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.weeklyKnowledge')}</h2>
        <p className="mt-2 text-sm text-gray-400">Sprint 5</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.policyReminders')}</h2>
        <p className="mt-2 text-sm text-gray-400">Sprint 6</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.localDataStatus')}</h2>
        <p className="mt-2 text-sm text-gray-400">{children.length} children</p>
      </Card>
    </div>
  );
}