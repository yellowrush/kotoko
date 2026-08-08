import { useEffect, useMemo, useState } from 'react';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import { calculateAgeMonths, findNearestMunicipality } from '@kodoko/domain';
import type { TransportMode } from '@kodoko/recommendation';
import { useSelectedChildren } from '../hooks/useSelectedChildren';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { useKnowledge, useKnowledgeProgress } from '../hooks/useKnowledge';
import { usePolicies, usePolicyTasks } from '../hooks/usePolicies';
import { usePreference } from '../hooks/usePreference';
import { filterKnowledgeByAges, sortKnowledgeByRead } from '../lib/knowledge';
import { checkPolicyFor, daysUntil } from '../lib/policy';
import { recommendForChild } from '../lib/recommendations';
import { resolveRecommendationLocation } from '../lib/recommendationLocation';
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
  const { t } = useAppTranslation();
  const { children, selected, selectedIds, toggle, loading: childLoading } = useSelectedChildren();
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
  const { statusFor } = usePolicyTasks();

  // グループ人数は選択した子どもの人数に合わせて初期化する（最大 3 人以上）。
  useEffect(() => {
    if (selected.length >= 1) setGroupSize(Math.min(selected.length, 3));
  }, [selected.length]);

  const selectedAges = useMemo(() => selected.map((c) => calculateAgeMonths(c.birthDate)), [selected]);
  const selectedBirthDates = useMemo(() => selected.map((c) => c.birthDate), [selected]);

  const weeklyKnowledge = useMemo(
    () =>
      sortKnowledgeByRead(
        filterKnowledgeByAges(knowledge ?? [], selectedAges),
        readIds,
      ).slice(0, 3),
    [knowledge, selectedAges, readIds],
  );

  const policyReminders = useMemo(() => {
    const list = (policies ?? [])
      .filter((policy) =>
        selectedBirthDates.length > 0 &&
        selectedBirthDates.some((birthDate) =>
          checkPolicyFor(policy, {
            birthDate,
            municipalityCode: preference?.municipalityCode,
          }).matched,
        ),
      )
      .filter((policy) => statusFor(policy.id) !== 'dismissed')
      .sort((a, b) => {
        const aDeadline = a.applicationDeadlineAt?.slice(0, 10) ?? '9999-12-31';
        const bDeadline = b.applicationDeadlineAt?.slice(0, 10) ?? '9999-12-31';
        return aDeadline.localeCompare(bDeadline);
      });
    return list.slice(0, 3);
  }, [policies, selectedBirthDates, preference, statusFor]);

  function renderWeatherLabel(): string {
    if (!coords) return t('home.weatherUnavailable');
    if (weatherPending) return t('common.loading');
    if (weatherError || !weather) return t('home.weatherUnavailable');
    const label = t(`home.weatherConditions.${weather.condition}`);
    return weather.temperatureCelsius !== undefined
      ? `${label} ${Math.round(weather.temperatureCelsius)}°C`
      : label;
  }

  const recommendationLocation = useMemo(
    () => resolveRecommendationLocation(coords, preference?.municipalityCode),
    [coords, preference?.municipalityCode],
  );

  function locationPlace(city: string): string {
    return t('home.place', { prefecture: t('home.prefecture'), city });
  }

  function renderLocationInfo() {
    if (recommendationLocation.source === 'gps') {
      const nearest = findNearestMunicipality(
        recommendationLocation.point.latitude,
        recommendationLocation.point.longitude,
      );
      if (nearest) {
        return (
          <p className="mt-1 text-xs text-gray-500">
            {t('home.currentLocation', { place: locationPlace(nearest.nameJa) })}
          </p>
        );
      }
    }
    if (recommendationLocation.source === 'municipality') {
      return (
        <p className="mt-1 text-xs text-gray-500">
          {t('home.residence', { place: locationPlace(recommendationLocation.municipality.nameJa) })}
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
        children: selected,
        places: places ?? [],
        userLocation: recommendationLocation.point,
        maxDistanceKm: transportMode ? undefined : preference?.radiusKm,
        transportMode,
        groupSize,
        indoorOutdoorPreference: preference?.indoorOutdoorPreference,
        weather: weather ?? undefined,
      }),
    [
      selected,
      places,
      recommendationLocation.point,
      transportMode,
      groupSize,
      preference?.radiusKm,
      preference?.indoorOutdoorPreference,
      weather,
    ],
  );
  const hasPlaces = (places?.length ?? 0) > 0;
  const hasBlockingPlacesError = isError && !hasPlaces;

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

        {placesLoading && !hasPlaces && !isError && <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>}

        {isError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <p>{t('common.error')}</p>
            <button type="button" onClick={() => void refetch()} className="text-brand-700">
              {t('common.retry')}
            </button>
          </div>
        )}

        {!hasBlockingPlacesError && children.length === 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">{t('home.noChildYet')}</p>
            <Link to="/children/new" className="text-sm font-medium text-brand-700">
              {t('home.addChild')}
            </Link>
          </div>
        )}

        {!hasBlockingPlacesError && children.length > 0 && selected.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">{t('home.noSelectedChildren')}</p>
        )}

        {!hasBlockingPlacesError && selected.length > 0 && !placesLoading && recommendations.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">{t('home.noRecommendations')}</p>
        )}

        {!hasBlockingPlacesError &&
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
          {!childLoading && children.length > 0 && (
            <Link to="/children/new" className="text-xs font-medium text-brand-700">
              {t('home.addChild')}
            </Link>
          )}
        </div>
        {childLoading ? (
          <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>
        ) : children.length === 0 ? (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">{t('home.noChildYet')}</p>
            <Link to="/children/new" className="text-sm font-medium text-brand-700">
              {t('home.addChild')}
            </Link>
          </div>
        ) : (
          <p className="mt-1 text-xs text-gray-400">{t('home.selectChildrenHint')}</p>
        )}
        {childLoading ? null : children.length > 0 ? (
          <ul className="mt-1 flex flex-col">
            {children.map((child) => {
              const isChecked = selectedIds.includes(child.id);
              return (
                <li
                  key={child.id}
                  className={`flex items-center gap-3 rounded-lg px-1 py-2 ${
                    isChecked ? 'bg-brand-50/60' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(child.id)}
                    aria-pressed={isChecked}
                    aria-label={t('children.selectChild', { name: child.displayName })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChildAvatar
                      gender={child.gender}
                      ageMonths={calculateAgeMonths(child.birthDate)}
                      size="md"
                    />
                    <span className="min-w-0">
                      <span className={`block truncate text-sm font-medium ${isChecked ? 'text-brand-900' : 'text-gray-700'}`}>
                        {child.displayName}
                      </span>
                      <span className="block text-xs text-gray-500">
                        <AgeLabel birthDate={child.birthDate} />
                      </span>
                    </span>
                  </button>
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300'
                    }`}
                  >
                    {isChecked ? '✓' : ''}
                  </span>
                  <Link
                    to={`/children/${child.id}/edit`}
                    className="shrink-0 text-xs font-medium text-brand-700"
                  >
                    {t('common.edit')}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
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
