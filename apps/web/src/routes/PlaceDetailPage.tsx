import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { localDateString } from '@kodoko/local-db';
import { haversineDistanceKm } from '@kodoko/recommendation';
import { detailBackTo } from '../lib/navigation';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { usePlace } from '../hooks/usePlaces';
import { useFavorites } from '../hooks/useFavorites';
import { usePlaceVisit } from '../hooks/usePlaceVisits';
import { useActiveChild } from '../hooks/useActiveChild';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { placeGeneralCodes, scorePlaceForChild } from '../lib/recommendations';
import { RecommendationReasons } from '../components/RecommendationReasons';
import { PlaceMediaCarousel } from '../components/places/PlaceMediaCarousel';
import {
  getGoogleMapsSearchUrl,
  hasPublicPlaceMedia,
} from '../components/places/placePlaceholderMedia';
import { PlaceReservationSection } from '../components/places/PlaceReservationSection';
import { PlaceBasicInfo } from '../components/places/PlaceBasicInfo';
import { PlaceComments } from '../components/places/PlaceComments';
import { PlaceReportDialog } from '../components/places/PlaceReportDialog';
import { PlaceShareButton } from '../components/places/PlaceShareButton';

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-none stroke-current"
    >
      <path
        d="M15 6l-6 6 6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-none stroke-current"
    >
      <path
        d="M14 5h5v5M19 5l-9 9M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function GoogleMapsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7"
    >
      <path
        d="M12 3.2c-3.2 0-5.7 2.5-5.7 5.6 0 4.2 5.7 11.7 5.7 11.7s5.7-7.5 5.7-11.7c0-3.1-2.5-5.6-5.7-5.6Z"
        className="fill-brand-600"
      />
      <path
        d="M12 6.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z"
        className="fill-white"
      />
      <path
        d="M4.6 19.8 8.2 16l2.2 2.1-2.5 2.7H5.3c-.8 0-1.1-.5-.7-1Z"
        className="fill-emerald-500"
      />
      <path
        d="M19.4 19.8 15.8 16l-2.2 2.1 2.5 2.7h2.6c.8 0 1.1-.5.7-1Z"
        className="fill-sky-500"
      />
    </svg>
  );
}

function FavoriteIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? 'fill-current' : 'fill-none'} stroke-current`}
    >
      <path
        d="M12 20s-7-4.3-9-9.2C1.6 7.3 3.7 4 7.1 4c2 0 3.5 1.1 4.4 2.4C12.4 5.1 13.9 4 15.9 4c3.4 0 5.5 3.3 4.1 6.8C18.9 15.7 12 20 12 20Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
    >
      <path
        d="M20 6L9 17l-5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
    >
      <path
        d="M12 8v5M12 17h.01M10.3 4.9 3.8 16.1A2 2 0 0 0 5.5 19h13a2 2 0 0 0 1.7-2.9L13.7 4.9a2 2 0 0 0-3.4 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function PlaceDetailPage() {
  const { t } = useAppTranslation();
  const location = useLocation();
  const { placeId } = useParams();
  const { data: place, isLoading, isError, refetch } = usePlace(placeId);
  const { favoriteIds, toggle } = useFavorites();
  const { latestVisit, recordToday } = usePlaceVisit(place?.id);
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
      return [
        ...new Set(
          recommendation.reasons
            .filter((r) => r.code !== 'not_published')
            .map((r) => r.code),
        ),
      ];
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
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-brand-700"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const isFav = favoriteIds.has(place.id);
  const visitedToday = latestVisit?.visitDate === localDateString();
  const officialUrl = place.websiteUrl ?? place.sourceUrl;
  const backTo = detailBackTo(location.state, '/places');
  const distanceKm = coords ? haversineDistanceKm(coords, place) : null;
  const googleMapsPhotosLabel = t('places.googleMapsPhotos');

  const googleMapsPhotosAction = !hasPublicPlaceMedia(place) ? (
    <a
      href={getGoogleMapsSearchUrl(place)}
      target="_blank"
      rel="noreferrer"
      aria-label={googleMapsPhotosLabel}
      title={googleMapsPhotosLabel}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/90 bg-white/95 text-brand-700 shadow-[0_3px_0_rgba(120,53,15,0.18),0_10px_18px_rgba(0,0,0,0.16)] backdrop-blur hover:bg-brand-50"
    >
      <GoogleMapsIcon />
    </a>
  ) : undefined;

  const officialSiteAction = officialUrl ? (
    <a
      href={officialUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-white/90 bg-white/95 px-3 py-1.5 text-sm font-bold text-brand-700 shadow-[0_3px_0_rgba(120,53,15,0.18),0_10px_18px_rgba(0,0,0,0.16)] backdrop-blur"
    >
      {t('places.officialSite')}
      <ExternalLinkIcon />
    </a>
  ) : undefined;

  const mediaAction =
    googleMapsPhotosAction || officialSiteAction ? (
      <div className="flex items-center gap-2">
        {googleMapsPhotosAction}
        {officialSiteAction}
      </div>
    ) : undefined;

  return (
    <div>
      <div className="mb-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Link
          to={backTo}
          className="inline-flex min-h-10 items-center gap-1 justify-self-start rounded-full border border-brand-100 bg-white/80 px-3 text-sm font-semibold text-gray-600 shadow-sm hover:bg-brand-50 hover:text-brand-700"
        >
          <ArrowLeftIcon />
          {t('common.back')}
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-bold leading-snug text-gray-900">
            {place.name}
          </h1>
          {place.shortDescription && (
            <p className="mt-0.5 truncate text-xs leading-relaxed text-gray-500">
              {place.shortDescription}
            </p>
          )}
        </div>
        <PlaceShareButton place={place} />
      </div>

      <PlaceMediaCarousel
        place={place}
        action={mediaAction}
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => void toggle(place.id)}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center text-xs font-bold leading-tight shadow-[0_4px_0_rgba(120,53,15,0.12)] transition active:translate-y-0.5 ${
            isFav
              ? 'border-rose-300 bg-rose-50 text-rose-600'
              : 'border-brand-200 bg-white text-gray-600 hover:bg-brand-50'
          }`}
        >
          <FavoriteIcon active={isFav} />
          <span className="line-clamp-2">
            {isFav ? t('places.favorited') : t('places.favorite')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void recordToday()}
          disabled={visitedToday}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center text-xs font-bold leading-tight shadow-[0_4px_0_rgba(120,53,15,0.12)] transition active:translate-y-0.5 disabled:cursor-default ${
            visitedToday
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-brand-200 bg-white text-gray-600 hover:bg-brand-50'
          }`}
        >
          <CheckIcon />
          <span className="line-clamp-2">
            {visitedToday
              ? t('placeVisits.visitedToday')
              : t('placeVisits.markVisited')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs font-bold leading-tight text-amber-700 shadow-[0_4px_0_rgba(120,53,15,0.12)] transition hover:bg-amber-100 active:translate-y-0.5"
        >
          <ReportIcon />
          <span className="line-clamp-2">{t('placeReport.reportLink')}</span>
        </button>
      </div>

      {latestVisit && (
        <p className="mt-2 text-xs text-gray-500">
          {t('placeVisits.latestVisit', { date: latestVisit.visitDate })}
        </p>
      )}

      <div className="kodoko-panel mt-4 bg-brand-50/70 p-3">
        <h3 className="text-sm font-semibold text-gray-600">
          {t('places.whyRecommended')}
        </h3>
        {recommendation && (
          <p className="mt-1 text-xs text-gray-500">
            {t('home.score')}: {recommendation.score}
          </p>
        )}
        {reasonCodes.length > 0 && (
          <div className="mt-2">
            <RecommendationReasons
              reasonCodes={reasonCodes}
              distanceKm={distanceKm}
            />
          </div>
        )}
        {!active && (
          <p className="mt-2 text-xs text-gray-400">
            {t('places.recommendedHint')}
          </p>
        )}
      </div>

      <div className="mt-4">
        <PlaceBasicInfo place={place} distanceKm={distanceKm} />
      </div>

      <PlaceReservationSection place={place} />
      <PlaceComments placeId={place.id} />

      <PlaceReportDialog
        placeId={place.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
