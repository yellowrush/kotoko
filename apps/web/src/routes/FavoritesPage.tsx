import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { haversineDistanceKm } from '@kodoko/recommendation';
import { useFavorites } from '../hooks/useFavorites';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { usePlaceVisits } from '../hooks/usePlaceVisits';
import { formatDistanceKm } from '../lib/placeFilters';
import { CATEGORY_ICON } from '../components/places/categoryMeta';
import { PageHeader } from '../components/PageHeader';

type ListTab = 'favorites' | 'visits';

export function FavoritesPage() {
  const { t, locale } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<ListTab>('favorites');
  const { favoriteIds, loading, toggle } = useFavorites();
  const { visits, loading: visitsLoading, remove } = usePlaceVisits();
  const { data: places, isLoading } = usePlaces();
  const { coords } = useGeolocation();

  const favorites = (places ?? []).filter((place) => favoriteIds.has(place.id));
  const placeById = useMemo(
    () => new Map((places ?? []).map((place) => [place.id, place])),
    [places],
  );
  const dateFormatter = useMemo(() => {
    const dateLocale =
      locale === 'zh-CN' ? 'zh-CN' : locale === 'zh-TW' ? 'zh-TW' : 'ja-JP';
    return new Intl.DateTimeFormat(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  }, [locale]);
  const busy = loading || visitsLoading || isLoading;

  return (
    <div>
      <PageHeader title={t('favorites.title')} />

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-brand-50 p-1 shadow-inner">
        {(['favorites', 'visits'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`min-h-10 rounded-full px-3 text-sm font-bold transition ${
              activeTab === tab
                ? 'bg-white text-brand-800 shadow-sm'
                : 'text-gray-500 hover:text-brand-700'
            }`}
          >
            {t(`favorites.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {busy ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : activeTab === 'favorites' ? (
        <FavoritePlacesList
          favorites={favorites}
          coords={coords}
          toggle={toggle}
          t={t}
        />
      ) : (
        <VisitedPlacesList
          visits={visits}
          placeById={placeById}
          dateFormatter={dateFormatter}
          remove={remove}
          t={t}
        />
      )}
    </div>
  );
}

function FavoritePlacesList({
  favorites,
  coords,
  toggle,
  t,
}: {
  favorites: NonNullable<ReturnType<typeof usePlaces>['data']>;
  coords: { latitude: number; longitude: number } | null;
  toggle: (placeId: string) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (favorites.length === 0) {
    return <p className="text-sm text-gray-500">{t('favorites.empty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {favorites.map((place) => (
        <li
          key={place.id}
          className="kodoko-list-item flex items-center gap-2 p-2"
        >
          <Link
            to={`/places/${place.id}`}
            state={{ backTo: '/favorites' }}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="shrink-0 text-lg">
              {CATEGORY_ICON[place.category]}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {place.name}
              </span>
              <span className="text-xs text-gray-500">
                {coords
                  ? formatDistanceKm(haversineDistanceKm(coords, place))
                  : place.address}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void toggle(place.id)}
            className="min-h-10 shrink-0 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm"
          >
            {t('places.favorited')}
          </button>
        </li>
      ))}
    </ul>
  );
}

function VisitedPlacesList({
  visits,
  placeById,
  dateFormatter,
  remove,
  t,
}: {
  visits: ReturnType<typeof usePlaceVisits>['visits'];
  placeById: Map<string, NonNullable<ReturnType<typeof usePlaces>['data']>[number]>;
  dateFormatter: Intl.DateTimeFormat;
  remove: (id: string) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (visits.length === 0) {
    return (
      <div className="kodoko-panel p-4">
        <p className="text-sm text-gray-500">{t('placeVisits.empty')}</p>
        <Link
          to="/places"
          className="mt-3 inline-flex min-h-10 items-center rounded-full bg-brand-50 px-3 text-sm font-semibold text-brand-700 shadow-sm"
        >
          {t('home.allPlaces')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-gray-500">
        {t('placeVisits.localOnly')}
      </p>
      <ul className="flex flex-col gap-2">
        {visits.map((visit) => {
          const place = placeById.get(visit.placeId);
          return (
            <li
              key={visit.id}
              className="kodoko-list-item flex items-center gap-2 p-2"
            >
              <Link
                to={`/places/${visit.placeId}`}
                state={{ backTo: '/favorites' }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <span className="shrink-0 text-lg" aria-hidden="true">
                  {place ? CATEGORY_ICON[place.category] : '📍'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {place?.name ?? t('placeVisits.unknownPlace')}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {dateFormatter.format(new Date(`${visit.visitDate}T00:00:00`))}
                    {place?.address ? ` · ${place.address}` : ''}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void remove(visit.id)}
                className="min-h-10 shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm"
              >
                {t('common.delete')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
