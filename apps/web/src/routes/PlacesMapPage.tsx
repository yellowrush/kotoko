import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { calculateAgeMonths } from '@kodoko/domain';
import type { Place } from '@kodoko/domain';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { PlaceFilterChips } from '../components/places/PlaceFilterChips';
import { PlaceBottomSheet } from '../components/places/PlaceBottomSheet';
import { usePlaces, usePlacesFilters } from '../hooks/usePlaces';
import { DEFAULT_CENTER, useGeolocation } from '../hooks/useGeolocation';
import { useActiveChild } from '../hooks/useActiveChild';
import { filterPlaces, formatDistanceKm } from '../lib/placeFilters';
import type { FilteredPlace } from '../lib/placeFilters';
import { lazyWithStaleAssetRecovery } from '../lib/staleAssets';
import { pickRandomItem, subscribeRandomPlaceRequest } from '../lib/randomPlace';
import { CATEGORY_ICON } from '../components/places/categoryMeta';

const PlacesMap = lazy(() =>
  lazyWithStaleAssetRecovery(() => import('../components/places/PlacesMap')).then((mod) => ({
    default: mod.PlacesMap,
  })),
);

export function PlacesMapPage() {
  const { t } = useAppTranslation();
  const { data: places, isLoading, isError, refetch } = usePlaces();
  const {
    filters,
    setCategory,
    setIndoorOutdoor,
    setRadius,
    setPlaceId,
    toggleTag,
  } = usePlacesFilters();
  const { status, coords, requested, request } = useGeolocation();
  const { active } = useActiveChild();
  const [tileError, setTileError] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [randomPlace, setRandomPlace] = useState<FilteredPlace | null>(null);
  const [randomPickerOpen, setRandomPickerOpen] = useState(false);
  const randomModalTimerRef = useRef<number | null>(null);
  const filteredRef = useRef<FilteredPlace[]>([]);
  const setPlaceIdRef = useRef(setPlaceId);
  setPlaceIdRef.current = setPlaceId;

  const ageMonths = active ? calculateAgeMonths(active.birthDate) : undefined;

  const filtered = useMemo(
    () =>
      filterPlaces(
        places ?? [],
        { ...filters, userLocation: coords ?? DEFAULT_CENTER },
        ageMonths,
      ),
    [places, filters, coords, ageMonths],
  );
  filteredRef.current = filtered;

  const center = coords ?? DEFAULT_CENTER;

  useEffect(() => {
    function onRandomPlaceRequest() {
      const picked = pickRandomItem(filteredRef.current);
      if (!picked) return;
      setFilterOpen(false);
      setSheetCollapsed(true);
      setRandomPickerOpen(false);
      setRandomPlace(picked);
      setPlaceIdRef.current(picked.id);
      if (randomModalTimerRef.current !== null) {
        window.clearTimeout(randomModalTimerRef.current);
      }
      randomModalTimerRef.current = window.setTimeout(() => {
        setRandomPickerOpen(true);
        randomModalTimerRef.current = null;
      }, 680);
    }

    const unsubscribe = subscribeRandomPlaceRequest(onRandomPlaceRequest);
    return unsubscribe;
  }, []);

  useEffect(
    () => () => {
      if (randomModalTimerRef.current !== null) {
        window.clearTimeout(randomModalTimerRef.current);
      }
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-500">
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-500">
              {t('common.loading')}
            </div>
          }
        >
          <PlacesMap
            places={filtered}
            selectedPlaceId={filters.placeId}
            onSelectPlace={setPlaceId}
            initialCenter={center}
            initialZoom={coords ? 13 : 10}
            userLocation={coords}
            onStyleError={() => setTileError(true)}
          />
        </Suspense>

        {tileError && (
          <p className="absolute left-3 top-16 z-[6] max-w-[60%] rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
            {t('places.mapTilesUnavailable')}
          </p>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[20] flex items-start gap-2 p-3">
          <div className="pointer-events-auto w-fit">
            <PlaceFilterChips
              filters={filters}
              resultCount={filtered.length}
              open={filterOpen}
              onOpenChange={(open) => {
                setFilterOpen(open);
                if (open) setSheetCollapsed(true);
              }}
              setCategory={setCategory}
              setIndoorOutdoor={setIndoorOutdoor}
              setRadius={setRadius}
              toggleTag={toggleTag}
            />
          </div>
          <button
            type="button"
            onClick={request}
            className="kodoko-control pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700"
          >
            <span aria-hidden>📍</span>
            {t('places.locate')}
          </button>
        </div>

        {requested && status === 'denied' && (
          <p className="absolute bottom-2 left-3 z-[6] rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
            {t('places.locationDenied')}
          </p>
        )}
      </div>

      <div className="z-10 bg-white/80 pb-32">
        <PlaceBottomSheet
          places={filtered}
          selectedPlaceId={filters.placeId}
          collapsed={sheetCollapsed}
          onToggleCollapsed={() => {
            setSheetCollapsed((v) => {
              const next = !v;
              if (next) setFilterOpen(false);
              return next;
            });
          }}
          onSelect={setPlaceId}
        />
      </div>

      {randomPickerOpen && randomPlace && (
        <RandomPlaceDialog
          place={randomPlace}
          onClose={() => setRandomPickerOpen(false)}
        />
      )}
    </div>
  );
}

function RandomPlaceDialog({
  place,
  onClose,
}: {
  place: FilteredPlace & Place;
  onClose: () => void;
}) {
  const { t } = useAppTranslation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/30 px-5 py-8 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label={t('common.cancel')}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="random-place-title"
        className="relative z-10 w-full max-w-[21rem] overflow-hidden rounded-[1.35rem] border-2 border-brand-900 bg-white shadow-[0_18px_0_rgba(120,53,15,0.12),0_24px_42px_rgba(31,41,55,0.28)]"
      >
        <div className="bg-amber-50 px-5 pb-4 pt-5 text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-900 bg-white text-4xl shadow-[0_5px_0_rgba(120,53,15,0.18)]"
            aria-hidden="true"
          >
            {CATEGORY_ICON[place.category]}
          </div>
          <p className="mt-3 text-xs font-extrabold text-brand-700">
            {t('places.random.resultEyebrow')}
          </p>
          <h2
            id="random-place-title"
            className="mt-1 text-xl font-black leading-snug text-gray-950"
          >
            {place.name}
          </h2>
        </div>

        <div className="px-5 pb-5 pt-4">
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold text-gray-600">
              {place.distanceKm !== null && (
                <>
                  <span className="rounded-full bg-brand-100 px-2 py-1 text-brand-800">
                    {formatDistanceKm(place.distanceKm)}
                  </span>
                </>
              )}
              <span className="rounded-full bg-white px-2 py-1">
                {t(`places.categories.${place.category}`)}
              </span>
              <span className="rounded-full bg-white px-2 py-1">
                {t(`places.indoorOutdoor.${place.indoorOutdoor}`)}
              </span>
            </p>
          </div>

          {place.shortDescription && (
            <p className="mt-3 rounded-xl bg-white text-center text-sm font-medium leading-relaxed text-gray-600">
              {place.shortDescription}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="kodoko-button kodoko-button-secondary min-h-11 px-3 text-sm font-bold"
            >
              {t('common.cancel')}
            </button>
            <Link
              to={`/places/${place.id}`}
              state={{ backTo: '/places' }}
              className="kodoko-button kodoko-button-primary flex min-h-11 items-center justify-center px-3 text-center text-sm font-bold"
            >
              {t('places.random.viewDetails')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
