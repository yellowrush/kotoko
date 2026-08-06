import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { haversineDistanceKm } from '@kodoko/recommendation';
import { usePlace } from '../hooks/usePlaces';
import { useFavorites } from '../hooks/useFavorites';
import { useActiveChild } from '../hooks/useActiveChild';
import { useGeolocation } from '../hooks/useGeolocation';
import { scorePlaceForChild } from '../lib/recommendations';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { CATEGORY_ICON, TAG_ICON } from '../components/places/categoryMeta';
import { PageHeader } from '../components/PageHeader';

export function PlaceDetailPage() {
  const { t } = useTranslation();
  const { placeId } = useParams();
  const { data: place, isLoading, isError, refetch } = usePlace(placeId);
  const { favoriteIds, toggle } = useFavorites();
  const { active } = useActiveChild();
  const { coords } = useGeolocation();

  const recommendation = useMemo(
    () =>
      place
        ? scorePlaceForChild({ child: active, place, userLocation: coords ?? undefined })
        : undefined,
    [active, place, coords],
  );

  if (isLoading) {
    return <p className="text-gray-400">{t('loading')}</p>;
  }

  if (isError || !place) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-500">
        <p>{t('common.error')}</p>
        <button type="button" onClick={() => void refetch()} className="text-brand-700">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const isFav = favoriteIds.has(place.id);

  return (
    <div>
      <PageHeader title={place.name} />

      <div className="flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-amber-50 text-6xl">
        {CATEGORY_ICON[place.category]}
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <p className="flex items-center gap-2">
          <span>{CATEGORY_ICON[place.category]}</span>
          <span className="font-medium">{t(`places.categories.${place.category}`)}</span>
          <span className="text-gray-400">· {t(`places.indoorOutdoor.${place.indoorOutdoor}`)}</span>
          {place.tags && place.tags.length > 0 && (
            <span className="flex gap-1">
              {place.tags.map((tag) => (
                <span key={tag} className="text-xs">
                  {TAG_ICON[tag]} {t(`places.tags.${tag}`)}
                </span>
              ))}
            </span>
          )}
        </p>

        {place.shortDescription && <p className="text-gray-600">{place.shortDescription}</p>}

        <p className="text-gray-500">📍 {place.address}</p>

        <p className="flex flex-wrap items-center gap-3 text-gray-500">
          {place.suitableAgeMinMonths !== undefined || place.suitableAgeMaxMonths !== undefined ? (
            <span>
              {t('places.suitableAgeLabel')}{' '}
              <span className="font-medium">
                {place.suitableAgeMinMonths ?? 0}~{place.suitableAgeMaxMonths ?? '∞'}{' '}
                {t('places.monthsUnit')}
              </span>
            </span>
          ) : (
            <span>{t('places.allAgesLabel')}</span>
          )}
        </p>

        <p className="flex flex-wrap gap-2 text-gray-600">
          {place.strollerFriendly && <span>👶 {t('places.facilities.stroller')}</span>}
          {place.nursingRoom && <span>🍼 {t('places.facilities.nursingRoom')}</span>}
          {place.diaperChanging && <span>🟰 {t('places.facilities.diaper')}</span>}
        </p>

        {place.priceLevel !== undefined && (
          <p className="text-gray-500">{t('places.priceLabel')}: {'￥'.repeat(place.priceLevel) || t('places.free')}</p>
        )}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void toggle(place.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              isFav ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-300 text-gray-600'
            }`}
          >
            {isFav ? t('places.favorited') : t('places.favorite')}
          </button>
        </div>

        {recommendation && recommendation.reasons.length > 0 && (
          <div className="mt-4 rounded-xl bg-brand-50/60 p-3">
            <h3 className="text-sm font-semibold text-gray-600">{t('places.whyRecommended')}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {t('home.score')}: {recommendation.score}
            </p>
            <div className="mt-2">
              <RecommendationReasons
                reasonCodes={recommendation.reasons.map((reason) => reason.code)}
                distanceKm={coords ? haversineDistanceKm(coords, place) : null}
              />
            </div>
          </div>
        )}

        {place.sourceUrl && (
          <a
            href={place.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-brand-700"
          >
            {t('places.officialSite')} ↗
          </a>
        )}
      </div>

      <Link to="/places" className="mt-6 block text-sm text-gray-500">
        ← {t('places.backToMap')}
      </Link>
    </div>
  );
}