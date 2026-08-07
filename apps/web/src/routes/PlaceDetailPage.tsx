import { Link, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { haversineDistanceKm } from '@kodoko/recommendation';
import { usePlace } from '../hooks/usePlaces';
import { useFavorites } from '../hooks/useFavorites';
import { useActiveChild } from '../hooks/useActiveChild';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { placeGeneralCodes, scorePlaceForChild } from '../lib/recommendations';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { CATEGORY_ICON, TAG_ICON } from '../components/places/categoryMeta';
import { PlaceMediaCarousel } from '../components/places/PlaceMediaCarousel';
import { PlaceLabelChips } from '../components/places/PlaceLabelChips';
import { PlacePriceSection } from '../components/places/PlacePriceSection';
import { PlaceReservationSection } from '../components/places/PlaceReservationSection';
import { PlaceBasicInfo } from '../components/places/PlaceBasicInfo';
import { PlaceComments } from '../components/places/PlaceComments';
import { PlaceReportDialog } from '../components/places/PlaceReportDialog';

const EXTRA_TAGS = ['group-play', 'quiet-zone'] as const;

export function PlaceDetailPage() {
  const { t } = useTranslation();
  const { placeId } = useParams();
  const { data: place, isLoading, isError, refetch } = usePlace(placeId);
  const { favoriteIds, toggle } = useFavorites();
  const { active } = useActiveChild();
  const { coords } = useGeolocation();
  const { data: weather } = useWeather(coords);
  const [reportOpen, setReportOpen] = useState(false);

  const recommendation = useMemo(
    () =>
      place
        ? scorePlaceForChild({
            child: active,
            place,
            userLocation: coords ?? undefined,
            weather: weather ?? undefined,
          })
        : undefined,
    [active, place, coords, weather],
  );

  const reasonCodes = useMemo(() => {
    if (!place) return [];
    if (recommendation) {
      return [...new Set(recommendation.reasons.filter((r) => r.code !== 'not_published').map((r) => r.code))];
    }
    return placeGeneralCodes(place, weather ?? undefined);
  }, [place, recommendation, weather]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-72 rounded-xl bg-gray-200" />
        <div className="mt-4 h-6 w-1/2 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-2/3 rounded bg-gray-200" />
        <div className="mt-8 h-32 rounded-xl bg-gray-100" />
      </div>
    );
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
  const officialUrl = place.websiteUrl ?? place.sourceUrl;
  const extraTags = place.tags?.filter((tag) => (EXTRA_TAGS as readonly string[]).includes(tag)) ?? [];

  return (
    <div>
      <Link to="/places" className="mb-2 inline-flex items-center text-sm font-medium text-gray-600 hover:text-brand-700">
        ← {t('common.back')}
      </Link>
      <PlaceMediaCarousel place={place} fallbackEmoji={CATEGORY_ICON[place.category]} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-snug text-gray-900">{place.name}</h1>
          {place.shortDescription && (
            <p className="mt-1 text-sm text-gray-500">{place.shortDescription}</p>
          )}
        </div>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-700"
          >
            {t('places.officialSite')}
            <span aria-hidden>↗</span>
          </a>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
        <span className="flex items-center gap-1 font-medium">
          <span aria-hidden>{CATEGORY_ICON[place.category]}</span>
          {t(`places.categories.${place.category}`)}
        </span>
        <span className="text-gray-400">·</span>
        <span>{t(`places.indoorOutdoor.${place.indoorOutdoor}`)}</span>
        {extraTags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-xs text-gray-400">
            <span aria-hidden>{TAG_ICON[tag]}</span>
            {t(`places.tags.${tag}`)}
          </span>
        ))}
      </div>

      <div className="mt-2.5">
        <PlaceLabelChips place={place} />
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        {place.suitableAgeMinMonths !== undefined || place.suitableAgeMaxMonths !== undefined ? (
          <span>
            {t('places.suitableAgeLabel')}{' '}
            <span className="font-medium text-gray-700">
              {place.suitableAgeMinMonths ?? 0}~{place.suitableAgeMaxMonths ?? '∞'}{' '}
              {t('places.monthsUnit')}
            </span>
          </span>
        ) : (
          <span>{t('places.allAgesLabel')}</span>
        )}
        {coords && (
          <span className="text-gray-400">
            {t('places.distance', { distance: `${haversineDistanceKm(coords, place).toFixed(1)}km` })}
          </span>
        )}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void toggle(place.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            isFav ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-300 text-gray-600'
          }`}
        >
          {isFav ? t('places.favorited') : t('places.favorite')}
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600"
        >
          {t('placeReport.reportLink')}
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-brand-50/60 p-3">
        <h3 className="text-sm font-semibold text-gray-600">{t('places.whyRecommended')}</h3>
        {recommendation && (
          <p className="mt-1 text-xs text-gray-500">
            {t('home.score')}: {recommendation.score}
          </p>
        )}
        {reasonCodes.length > 0 && (
          <div className="mt-2">
            <RecommendationReasons
              reasonCodes={reasonCodes}
              distanceKm={coords ? haversineDistanceKm(coords, place) : null}
            />
          </div>
        )}
        {!active && <p className="mt-2 text-xs text-gray-400">{t('places.recommendedHint')}</p>}
      </div>

      <PlacePriceSection place={place} />
      <PlaceReservationSection place={place} />

      <div className="mt-4">
        <PlaceBasicInfo place={place} />
      </div>

      <PlaceComments placeId={place.id} />

      <PlaceReportDialog placeId={place.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}