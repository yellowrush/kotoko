import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import type { TransportMode } from '@kodoko/recommendation';
import { useActiveChild } from '../hooks/useActiveChild';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { recommendForChild } from '../lib/recommendations';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { AgeLabel } from '../components/AgeLabel';
import { PageHeader } from '../components/PageHeader';
import { CATEGORY_ICON } from '../components/places/categoryMeta';

const TRANSPORT_OPTIONS: { value: TransportMode | undefined; key: string }[] = [
  { value: undefined, key: 'home.transportNone' },
  { value: 'walking', key: 'home.transportWalking' },
  { value: 'bicycle', key: 'home.transportBicycle' },
  { value: 'car', key: 'home.transportCar' },
  { value: 'train', key: 'home.transportTrain' },
];

// 3 人以上視為多人同行，觸發 group-play 加分。
const GROUP_OPTIONS: { value: number | undefined; key: string }[] = [
  { value: undefined, key: 'home.groupNone' },
  { value: 1, key: 'home.group1' },
  { value: 2, key: 'home.group2' },
  { value: 3, key: 'home.group3' },
];

function ChipGroup<T>({
  label,
  options,
  value,
  onChange,
  tKey,
}: {
  label: string;
  options: { value: T; key: string }[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
  tKey: (key: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
      <span className="mr-1">{label}</span>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(active ? undefined : option.value)}
            className={`rounded-full border px-2 py-0.5 ${
              active ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-300 bg-white text-gray-600'
            }`}
          >
            {tKey(option.key)}
          </button>
        );
      })}
    </div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { children, active, setActive, loading: childLoading } = useActiveChild();
  const { data: places, isLoading: placesLoading, isError, refetch } = usePlaces();
  const { coords } = useGeolocation();
  const { data: weather } = useWeather(coords);
  const [transportMode, setTransportMode] = useState<TransportMode | undefined>();
  const [groupSize, setGroupSize] = useState<number | undefined>();

  const recommendations = useMemo(
    () =>
      recommendForChild({
        child: active,
        places: places ?? [],
        userLocation: coords ?? undefined,
        transportMode,
        groupSize,
        weather: weather ?? undefined,
      }),
    [active, places, coords, transportMode, groupSize, weather],
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

        <div className="mt-2 flex flex-col gap-2">
          <ChipGroup
            label={t('home.transport')}
            options={TRANSPORT_OPTIONS}
            value={transportMode}
            onChange={(next) => setTransportMode(next)}
            tKey={t}
          />
          <ChipGroup
            label={t('home.groupSize')}
            options={GROUP_OPTIONS}
            value={groupSize}
            onChange={(next) => setGroupSize(next)}
            tKey={t}
          />
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