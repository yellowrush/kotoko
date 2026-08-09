import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { usePlaces } from '../hooks/usePlaces';
import { usePlaceVisits } from '../hooks/usePlaceVisits';
import { CATEGORY_ICON } from '../components/places/categoryMeta';
import { PageHeader } from '../components/PageHeader';

export function PlaceVisitsPage() {
  const { t, locale } = useAppTranslation();
  const { visits, loading, remove } = usePlaceVisits();
  const { data: places, isLoading: placesLoading } = usePlaces();

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

  return (
    <div>
      <PageHeader title={t('placeVisits.title')} backTo="/home" />

      <p className="mb-3 text-xs text-gray-500">
        {t('placeVisits.localOnly')}
      </p>

      {loading || placesLoading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : visits.length === 0 ? (
        <div className="kodoko-panel p-4">
          <p className="text-sm text-gray-500">{t('placeVisits.empty')}</p>
          <Link
            to="/places"
            className="mt-3 inline-flex min-h-10 items-center rounded-full bg-brand-50 px-3 text-sm font-semibold text-brand-700 shadow-sm"
          >
            {t('home.allPlaces')}
          </Link>
        </div>
      ) : (
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
                  state={{ backTo: '/visits' }}
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
      )}
    </div>
  );
}
