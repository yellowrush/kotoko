import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import { calculateAgeMonths, findMunicipality, findNearestMunicipality } from '@kodoko/domain';
import type { TransportMode } from '@kodoko/recommendation';
import { useActiveChild } from '../hooks/useActiveChild';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { useKnowledge, useKnowledgeProgress } from '../hooks/useKnowledge';
import { usePolicies, usePolicyMatches, usePolicyTasks } from '../hooks/usePolicies';
import { usePreference } from '../hooks/usePreference';
import { filterKnowledgeByAge, sortKnowledgeByRead } from '../lib/knowledge';
import { daysUntil } from '../lib/policy';
import { recommendForChild } from '../lib/recommendations';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { AgeLabel } from '../components/AgeLabel';
import { ChildAvatar } from '../components/ChildAvatar';
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
  const { preference } = usePreference();
  const {
    data: weather,
    isPending: weatherPending,
    isError: weatherError,
  } = useWeather(coords);
  const [transportMode, setTransportMode] = useState<TransportMode | undefined>();
  const [groupSize, setGroupSize] = useState<number | undefined>();
  const { data: knowledge, isLoading: knowledgeLoading } = useKnowledge();
  const { readIds } = useKnowledgeProgress();
  const { data: policies, isLoading: policiesLoading } = usePolicies();
  const matches = usePolicyMatches();
  const { statusFor } = usePolicyTasks();

  const weeklyKnowledge = useMemo(
    () =>
      sortKnowledgeByRead(
        filterKnowledgeByAge(knowledge ?? [], active ? calculateAgeMonths(active.birthDate) : undefined),
        readIds,
      ).slice(0, 3),
    [knowledge, active, readIds],
  );

  const policyReminders = useMemo(() => {
    const list = (policies ?? [])
      .filter((policy) => matches.get(policy.id)?.matched)
      .filter((policy) => statusFor(policy.id) !== 'dismissed')
      .sort((a, b) => {
        const aDeadline = a.applicationDeadlineAt?.slice(0, 10) ?? '9999-12-31';
        const bDeadline = b.applicationDeadlineAt?.slice(0, 10) ?? '9999-12-31';
        return aDeadline.localeCompare(bDeadline);
      });
    return list.slice(0, 3);
  }, [policies, matches, statusFor]);

  function renderWeatherLabel(): string {
    if (!coords) return t('home.weatherUnavailable');
    if (weatherPending) return t('common.loading');
    if (weatherError || !weather) return t('home.weatherUnavailable');
    const label = t(`home.weatherConditions.${weather.condition}`);
    return weather.temperatureCelsius !== undefined
      ? `${label} ${Math.round(weather.temperatureCelsius)}°C`
      : label;
  }

  const municipality = findMunicipality(preference?.municipalityCode);

  function locationPlace(city: string): string {
    return t('home.place', { prefecture: t('home.prefecture'), city });
  }

  function renderLocationInfo() {
    if (coords) {
      const nearest = findNearestMunicipality(coords.latitude, coords.longitude);
      if (nearest) {
        return (
          <p className="mt-1 text-xs text-gray-500">
            {t('home.currentLocation', { place: locationPlace(nearest.nameJa) })}
          </p>
        );
      }
    }
    if (municipality) {
      return (
        <p className="mt-1 text-xs text-gray-500">
          {t('home.residence', { place: locationPlace(municipality.nameJa) })}
        </p>
      );
    }
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        <span>{t('home.noLocation')}</span>
        <Link to="/settings" className="font-medium text-brand-700">
          {t('home.toSettings')}
        </Link>
      </p>
    );
  }

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
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">{t('home.recommendationsTitle')}</h2>
          <Link to="/places" className="text-xs font-medium text-brand-700">
            {t('home.allPlaces')}
          </Link>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <span>{t('home.currentWeather')}</span>
          <span className="font-medium text-gray-700">{renderWeatherLabel()}</span>
        </div>

        {renderLocationInfo()}

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

        {placesLoading && !isError && <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>}

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
          <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>
        ) : active ? (
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <ChildAvatar gender={active.gender} ageMonths={calculateAgeMonths(active.birthDate)} size="lg" />
              <div className="min-w-0">
                <p className="text-base font-medium">{active.displayName}</p>
                <Link to={`/children/${active.id}/edit`} className="text-xs font-medium text-brand-700">
                  {t('edit')}
                </Link>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              <AgeLabel birthDate={active.birthDate} />
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <Link to="/children/new" className="font-medium text-brand-700">
                {t('home.addChild')}
              </Link>
              {children.length > 1 && (
                <Link to="/children" className="text-gray-500">
                  {t('home.allChildren')}
                </Link>
              )}
            </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">{t('home.weeklyKnowledge')}</h2>
          <Link to="/knowledge" className="text-xs font-medium text-brand-700">
            {t('knowledge.viewAll')}
          </Link>
        </div>
        {knowledgeLoading ? (
          <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>
        ) : weeklyKnowledge.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">{t('knowledge.noContent')}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {weeklyKnowledge.map((item) => (
              <li key={item.id}>
                <Link to={`/knowledge/${item.id}`} className="block hover:opacity-80">
                  <p className="flex items-center gap-2 text-sm text-gray-700">
                    {!readIds.has(item.id) && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                    )}
                    <span className="min-w-0 truncate">{item.title}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">{t('home.policyReminders')}</h2>
          <Link to="/policies" className="text-xs font-medium text-brand-700">
            {t('policies.viewAll')}
          </Link>
        </div>
        {policiesLoading ? (
          <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>
        ) : policyReminders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">{t('policies.noMatch')}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {policyReminders.map((policy) => (
              <li key={policy.id}>
                <Link to={`/policies/${policy.id}`} className="block hover:opacity-80">
                  <p className="text-sm text-gray-700">{policy.title}</p>
                  {policy.applicationDeadlineAt && (
                    <p className="text-xs text-gray-400">
                      {t('policies.deadline')}: {policy.applicationDeadlineAt.slice(0, 10)}
                      {daysUntil(policy.applicationDeadlineAt) >= 0 &&
                        `（${t('policies.daysLeft', { days: daysUntil(policy.applicationDeadlineAt) })}）`}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}