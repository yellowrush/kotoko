import { useEffect, useMemo, useState } from 'react';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import { calculateAgeMonths, findNearestMunicipality, type Policy, type PolicyTaskState } from '@kodoko/domain';
import type { TransportMode } from '@kodoko/recommendation';
import { useSelectedChildren } from '../hooks/useSelectedChildren';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { useKnowledge, useKnowledgeProgress } from '../hooks/useKnowledge';
import { usePolicies, usePolicyTasksForChildren } from '../hooks/usePolicies';
import { usePreference } from '../hooks/usePreference';
import { prioritizeKnowledgeForAges } from '../lib/knowledge';
import { checkPolicyFor, daysUntil } from '../lib/policy';
import { recommendForChild } from '../lib/recommendations';
import { resolveRecommendationLocation } from '../lib/recommendationLocation';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { AgeLabel } from '../components/AgeLabel';
import { ChildAvatar } from '../components/ChildAvatar';
import { CATEGORY_ICON } from '../components/places/categoryMeta';

const TRANSPORT_OPTIONS: { value: TransportMode | undefined; key: string; emoji: string }[] = [
  { value: undefined, key: 'home.transportNone', emoji: '🧭' },
  { value: 'walking', key: 'home.transportWalking', emoji: '🚶' },
  { value: 'bicycle', key: 'home.transportBicycle', emoji: '🚲' },
  { value: 'car', key: 'home.transportCar', emoji: '🚗' },
  { value: 'train', key: 'home.transportTrain', emoji: '🚃' },
];

// 3 人以上視為多人同行，觸發 group-play 加分。
const GROUP_OPTIONS: { value: number | undefined; key: string; emoji: string }[] = [
  { value: undefined, key: 'home.groupNone', emoji: '👪' },
  { value: 1, key: 'home.group1', emoji: '1️⃣' },
  { value: 2, key: 'home.group2', emoji: '2️⃣' },
  { value: 3, key: 'home.group3', emoji: '3️⃣' },
];

const WEATHER_EMOJI = {
  sunny: '☀️',
  cloudy: '☁️',
  rain: '☔',
  snow: '❄️',
  storm: '⛈️',
  unknown: '🌤️',
} as const;

const RECOMMENDATION_RANKS = [
  {
    medal: '🥇',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-900 ring-amber-200',
    score: 'bg-amber-500 text-white shadow-amber-200',
  },
  {
    medal: '🥈',
    border: 'border-slate-300',
    bg: 'bg-slate-50',
    badge: 'bg-slate-100 text-slate-800 ring-slate-200',
    score: 'bg-slate-500 text-white shadow-slate-200',
  },
  {
    medal: '🥉',
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-900 ring-orange-200',
    score: 'bg-orange-500 text-white shadow-orange-200',
  },
] as const;

const POLICY_STATUS_PRIORITY: Record<PolicyTaskState['status'], number> = {
  new: 0,
  planned: 1,
  viewed: 2,
  completed: 3,
  dismissed: 4,
};

const POLICY_REMINDER_ITEM_STYLES = {
  unread: 'border-gray-200 bg-white hover:bg-white',
  read: 'border-gray-200 bg-white hover:bg-white',
} as const;

function policyStatusPriority(status: PolicyTaskState['status']): number {
  return POLICY_STATUS_PRIORITY[status];
}

function DropdownPill<T extends string | number | undefined>({
  label,
  emoji,
  options,
  value,
  onChange,
  tKey,
  dynamicIcon = false,
}: {
  label: string;
  emoji: string;
  options: { value: T; key: string; emoji: string }[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
  tKey: (key: string) => string;
  dynamicIcon?: boolean;
}) {
  const selectedValue = value === undefined ? '' : String(value);
  const selectedOption = options.find((option) => (option.value === undefined ? '' : String(option.value)) === selectedValue);
  const displayEmoji = dynamicIcon ? selectedOption?.emoji ?? emoji : emoji;

  return (
    <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      <span aria-hidden="true" className="text-base">
        {displayEmoji}
      </span>
      <span className="shrink-0 whitespace-nowrap text-gray-600">{label}</span>
      <select
        value={selectedValue}
        onChange={(event) => {
          const next = options.find((option) => (option.value === undefined ? '' : String(option.value)) === event.target.value);
          onChange(next?.value);
        }}
        className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold text-gray-900 outline-none"
      >
        {options.map((option) => (
          <option key={option.key} value={option.value === undefined ? '' : String(option.value)}>
            {tKey(option.key)}
          </option>
        ))}
      </select>
    </label>
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
  const policyTaskChildIds = useMemo(() => children.map((child) => child.id), [children]);
  const { statusFor, loading: policyTasksLoading } = usePolicyTasksForChildren(policyTaskChildIds);

  // グループ人数は選択した子どもの人数に合わせて初期化する（最大 3 人以上）。
  useEffect(() => {
    if (selected.length >= 1) setGroupSize(Math.min(selected.length, 3));
  }, [selected.length]);

  const registeredChildAges = useMemo(() => children.map((c) => calculateAgeMonths(c.birthDate)), [children]);
  const weeklyKnowledge = useMemo(
    () => prioritizeKnowledgeForAges(knowledge ?? [], registeredChildAges, readIds).slice(0, 3),
    [knowledge, registeredChildAges, readIds],
  );

  const policyReminders = useMemo(() => {
    const list = (policies ?? [])
      .map((policy) => {
        const matchedChildren = children.filter((child) =>
          checkPolicyFor(policy, {
            birthDate: child.birthDate,
            municipalityCode: preference?.municipalityCode,
          }).matched,
        );
        const statuses = matchedChildren
          .map((child) => statusFor(policy.id, child.id))
          .filter((status) => status !== 'dismissed');
        if (matchedChildren.length === 0 || statuses.length === 0) return null;
        return {
          policy,
          priority: Math.min(...statuses.map(policyStatusPriority)),
          unread:
            !policyTasksLoading && statuses.length > 0 && statuses.every((status) => status === 'new'),
        };
      })
      .filter((item): item is { policy: Policy; priority: number; unread: boolean } => item !== null)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aDeadline = a.policy.applicationDeadlineAt?.slice(0, 10) ?? '9999-12-31';
        const bDeadline = b.policy.applicationDeadlineAt?.slice(0, 10) ?? '9999-12-31';
        return aDeadline.localeCompare(bDeadline);
      })
      .map((item) => ({ policy: item.policy, unread: item.unread }));
    return list.slice(0, 3);
  }, [policies, children, preference, statusFor, policyTasksLoading]);

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

  function locationLabel(key: 'home.currentLocation' | 'home.residence'): string {
    return t(key, { place: '' }).trim();
  }

  function renderLocationInfo() {
    if (recommendationLocation.source === 'gps') {
      const nearest = findNearestMunicipality(
        recommendationLocation.point.latitude,
        recommendationLocation.point.longitude,
      );
      if (nearest) {
        return (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
            <span className="flex shrink-0 items-center gap-2">
              <span aria-hidden="true">📍</span>
              <span>{locationLabel('home.currentLocation')}</span>
            </span>
            <span className="min-w-0 flex-1 text-right font-semibold text-gray-900">{locationPlace(nearest.nameJa)}</span>
          </div>
        );
      }
    }
    if (recommendationLocation.source === 'municipality') {
      return (
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
          <span className="flex shrink-0 items-center gap-2">
            <span aria-hidden="true">🏠</span>
            <span>{locationLabel('home.residence')}</span>
          </span>
          <span className="min-w-0 flex-1 text-right font-semibold text-gray-900">
            {locationPlace(recommendationLocation.municipality.nameJa)}
          </span>
        </div>
      );
    }
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">⚙️</span>
          <span>{t('home.noLocation')}</span>
        </span>
        <Link to="/settings" className="font-medium text-brand-700">
          {t('home.toSettings')}
        </Link>
      </div>
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
          <h2 className="text-base font-semibold text-gray-900">{t('home.recommendationsTitle')}</h2>
          <Link to="/places" className="text-sm font-medium text-brand-700">
            {t('home.allPlaces')}
          </Link>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
            <span className="flex shrink-0 items-center gap-2">
              <span aria-hidden="true">{weather ? WEATHER_EMOJI[weather.condition] : '🌤️'}</span>
              <span>{t('home.currentWeather')}</span>
            </span>
            <span className="min-w-0 flex-1 text-right font-semibold text-gray-900">{renderWeatherLabel()}</span>
          </div>
          {renderLocationInfo()}
        </div>

        <div className="mt-3 grid gap-2">
          <DropdownPill
            label={t('home.transport')}
            emoji="🚃"
            options={TRANSPORT_OPTIONS}
            value={transportMode}
            onChange={(next) => setTransportMode(next)}
            tKey={t}
            dynamicIcon
          />
          <DropdownPill
            label={t('home.groupSize')}
            emoji="👪"
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
          recommendations.map((r, index) => {
            const rank = RECOMMENDATION_RANKS[index];
            return (
              <Link
                key={r.place.id}
                to={`/places/${r.place.id}`}
                state={{ backTo: '/home' }}
                className={`mt-2 flex min-h-20 items-start gap-3 rounded-xl border p-3 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-brand-600 ${
                  rank ? `${rank.border} ${rank.bg}` : 'border-gray-300 bg-white'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ring-1 ${
                    rank ? rank.badge : 'bg-brand-700 text-white ring-brand-200'
                  }`}
                  aria-hidden="true"
                >
                  {rank ? rank.medal : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className="shrink-0 text-lg" aria-hidden="true">
                      {CATEGORY_ICON[r.place.category]}
                    </span>
                    <span className="min-w-0 text-base font-semibold leading-snug text-gray-900">
                      {r.place.name}
                    </span>
                  </span>
                  <RecommendationReasons reasonCodes={r.reasonCodes} distanceKm={r.distanceKm} />
                </span>
                <span
                  className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center text-xs font-bold shadow-md ${
                    rank ? rank.score : 'bg-brand-700 text-white shadow-brand-100'
                  }`}
                >
                  <span className="block text-[10px] leading-none opacity-90">{t('home.score')}</span>
                  <span className="block text-base leading-tight">{r.score}</span>
                </span>
              </Link>
            );
          })}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{t('home.currentChild')}</h2>
          {!childLoading && children.length > 0 && (
            <Link to="/children/new" className="text-sm font-medium text-brand-700">
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
          <p className="mt-1 text-sm text-gray-500">{t('home.selectChildrenHint')}</p>
        )}
        {childLoading ? null : children.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {children.map((child) => {
              const isChecked = selectedIds.includes(child.id);
              return (
                <li
                  key={child.id}
                  className={`flex items-center gap-3 rounded-xl border px-2 py-2 shadow-sm ${
                    isChecked ? 'border-brand-300 bg-brand-50/70' : 'border-gray-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(child.id)}
                    aria-pressed={isChecked}
                    aria-label={t('children.selectChild', { name: child.displayName })}
                    className="touch-target flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChildAvatar
                      gender={child.gender}
                      ageMonths={calculateAgeMonths(child.birthDate)}
                      size="md"
                      selected={isChecked}
                    />
                    <span className="min-w-0">
                      <span className={`block truncate text-base font-semibold ${isChecked ? 'text-brand-900' : 'text-gray-800'}`}>
                        {child.displayName}
                      </span>
                      <span className="block text-sm text-gray-500">
                        <AgeLabel birthDate={child.birthDate} />
                      </span>
                    </span>
                  </button>
                  <Link
                    to={`/children/${child.id}/edit`}
                    className="touch-target inline-flex shrink-0 items-center text-sm font-medium text-brand-700"
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
          <h2 className="text-base font-semibold text-gray-900">{t('home.weeklyKnowledge')}</h2>
          <Link to="/knowledge" className="text-sm font-medium text-brand-700">
            {t('knowledge.viewAll')}
          </Link>
        </div>
        {knowledgeLoading ? (
          <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>
        ) : weeklyKnowledge.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">{t('knowledge.noContent')}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {weeklyKnowledge.map((item) => {
              const unread = !readIds.has(item.id);
              return (
                <li key={item.id}>
                  <Link
                    to={`/knowledge/${item.id}`}
                    state={{ backTo: '/home' }}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 shadow-sm transition hover:border-brand-300 ${
                      unread
                        ? 'border-brand-300 bg-brand-50/70 hover:bg-brand-50'
                        : 'border-gray-200 bg-white hover:bg-brand-50/30'
                    }`}
                  >
                    <span className="text-lg" aria-hidden="true">📘</span>
                    <p
                      className={`min-w-0 flex-1 truncate text-sm ${
                        unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    >
                      {item.title}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{t('home.policyReminders')}</h2>
          <Link to="/policies" className="text-sm font-medium text-brand-700">
            {t('policies.viewAll')}
          </Link>
        </div>
        {policiesLoading ? (
          <p className="mt-2 text-sm text-gray-400">{t('common.loading')}</p>
        ) : policyReminders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">{t('policies.noMatch')}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {policyReminders.map(({ policy, unread }) => (
              <li key={policy.id}>
                <Link
                  to={`/policies/${policy.id}`}
                  state={{ backTo: '/home' }}
                  className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 shadow-sm transition hover:border-brand-300 ${
                    unread ? POLICY_REMINDER_ITEM_STYLES.unread : POLICY_REMINDER_ITEM_STYLES.read
                  }`}
                >
                  <span aria-hidden="true">📌</span>
                  <p
                    className={`min-w-0 flex-1 truncate text-sm ${
                      unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    }`}
                  >
                    {policy.title}
                  </p>
                  {policy.applicationDeadlineAt && (
                    <span className="max-w-[45%] shrink-0 truncate text-xs text-gray-400">
                      {t('policies.deadline')}: {policy.applicationDeadlineAt.slice(0, 10)}
                      {daysUntil(policy.applicationDeadlineAt) >= 0 &&
                        `（${t('policies.daysLeft', { days: daysUntil(policy.applicationDeadlineAt) })}）`}
                    </span>
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
