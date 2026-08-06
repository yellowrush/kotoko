import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { haversineDistanceKm } from '@kodoko/recommendation';
import { useFavorites } from '../hooks/useFavorites';
import { usePlaces } from '../hooks/usePlaces';
import { useGeolocation } from '../hooks/useGeolocation';
import { formatDistanceKm } from '../lib/placeFilters';
import { CATEGORY_ICON } from '../components/places/categoryMeta';
import { PageHeader } from '../components/PageHeader';

export function FavoritesPage() {
  const { t } = useTranslation();
  const { favoriteIds, loading, toggle } = useFavorites();
  const { data: places, isLoading } = usePlaces();
  const { coords } = useGeolocation();

  const favorites = (places ?? []).filter((place) => favoriteIds.has(place.id));

  return (
    <div>
      <PageHeader title={t('favorites.title')} />

      {loading || isLoading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : favorites.length === 0 ? (
        <p className="text-sm text-gray-500">{t('favorites.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {favorites.map((place) => (
            <li key={place.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2">
              <Link to={`/places/${place.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-lg">{CATEGORY_ICON[place.category]}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{place.name}</span>
                  <span className="text-xs text-gray-500">
                    {coords ? formatDistanceKm(haversineDistanceKm(coords, place)) : place.address}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void toggle(place.id)}
                className="shrink-0 rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600"
              >
                {t('places.favorited')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}