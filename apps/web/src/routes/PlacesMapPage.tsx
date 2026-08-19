import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { calculateAgeMonths } from '@kodoko/domain';
import type { Place } from '@kodoko/domain';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { PlaceFilterChips } from '../components/places/PlaceFilterChips';
import { PlaceBottomSheet } from '../components/places/PlaceBottomSheet';
import {
  DEFAULT_PLACES_RADIUS_KM,
  usePlaceFacets,
  usePlaces,
  usePlacesFilters,
} from '../hooks/usePlaces';
import { DEFAULT_CENTER, useGeolocation } from '../hooks/useGeolocation';
import { useActiveChild } from '../hooks/useActiveChild';
import { usePlaceVisits } from '../hooks/usePlaceVisits';
import { filterPlaces, formatDistanceKm } from '../lib/placeFilters';
import type { FilteredPlace } from '../lib/placeFilters';
import { countVisitsByPlaceId } from '../lib/placeVisitMarkers';
import { lazyWithStaleAssetRecovery } from '../lib/staleAssets';
import {
  countPlacesByMunicipality,
  countPlacesByRailLine,
} from '../lib/placeLocationOptions';
import {
  pickRandomItem,
  subscribeRandomPlaceRequest,
} from '../lib/randomPlace';
import { getPlaceIcon } from '../components/places/categoryMeta';

const PlacesMap = lazy(() =>
  lazyWithStaleAssetRecovery(
    () => import('../components/places/PlacesMap'),
  ).then((mod) => ({
    default: mod.PlacesMap,
  })),
);

function LocationLineIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
    >
      <circle cx="12" cy="12" r="5.2" strokeWidth="2.3" />
      <path
        d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"
        strokeLinecap="round"
        strokeWidth="2.3"
      />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}

function SearchLineIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 fill-none stroke-current"
    >
      <circle cx="10.8" cy="10.8" r="6.2" strokeWidth="2.2" />
      <path
        d="M15.5 15.5 20 20"
        strokeLinecap="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

export function PlacesMapPage() {
  const { t } = useAppTranslation();
  const {
    filters,
    setCategory,
    setIndoorOutdoor,
    setLocationMode,
    setRadius,
setMunicipality,
    setRailLine,
    setPlaceId,
    setQuery,
    toggleTag,
  } = usePlacesFilters();
  const { status, coords, requested, request } = useGeolocation();
  const center = coords ?? DEFAULT_CENTER;
  const placesQuery = useMemo(() => {
    const base = {
      category: filters.category,
      indoorOutdoor: filters.indoorOutdoor,
      tags: filters.tags,
    };

    if (filters.locationMode === 'municipality' && filters.municipalityCode) {
      return { ...base, municipalityCode: filters.municipalityCode };
    }

    if (filters.locationMode === 'rail' && filters.railLineId) {
      return { ...base, railLineId: filters.railLineId };
    }

    return {
      ...base,
      latitude: center.latitude,
      longitude: center.longitude,
      radius: filters.radiusKm ?? DEFAULT_PLACES_RADIUS_KM,
    };
  }, [
    center.latitude,
    center.longitude,
    filters.category,
    filters.indoorOutdoor,
    filters.locationMode,
    filters.municipalityCode,
    filters.radiusKm,
    filters.railLineId,
    filters.tags,
  ]);
  const facetQuery = useMemo(
    () => ({
      category: filters.category,
      indoorOutdoor: filters.indoorOutdoor,
      tags: filters.tags,
    }),
    [filters.category, filters.indoorOutdoor, filters.tags],
  );
  const { data: places, isLoading, isError, refetch } = usePlaces(placesQuery);
  const { data: placeFacets } = usePlaceFacets(facetQuery);
  const { active } = useActiveChild();
  const { visits } = usePlaceVisits();
  const [tileError, setTileError] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [randomPlace, setRandomPlace] = useState<FilteredPlace | null>(null);
  const [randomPickerOpen, setRandomPickerOpen] = useState(false);
  const randomModalTimerRef = useRef<number | null>(null);
  const filteredRef = useRef<FilteredPlace[]>([]);
  const setPlaceIdRef = useRef(setPlaceId);
  setPlaceIdRef.current = setPlaceId;

  const ageMonths = active ? calculateAgeMonths(active.birthDate) : undefined;

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    setSearchDraft(filters.query ?? '');
  }, [filters.query]);

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
  const locationCountBase = useMemo(
    () =>
      filterPlaces(
        places ?? [],
        {
          category: filters.category,
          indoorOutdoor: filters.indoorOutdoor,
          tags: filters.tags,
        },
        ageMonths,
      ),
    [places, filters.category, filters.indoorOutdoor, filters.tags, ageMonths],
  );
  const municipalityCounts = useMemo(
    () =>
      placeFacets?.municipalities ??
      countPlacesByMunicipality(locationCountBase),
    [locationCountBase, placeFacets?.municipalities],
  );
  const railLineCounts = useMemo(
    () => placeFacets?.railLines ?? countPlacesByRailLine(locationCountBase),
    [locationCountBase, placeFacets?.railLines],
  );
  const visitCountsByPlaceId = useMemo(
    () => countVisitsByPlaceId(visits),
    [visits],
  );

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

  function handleMapSelectPlace(id: string) {
    setFilterOpen(false);
    setSheetCollapsed(false);
    setPlaceId(id);
  }

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
            onSelectPlace={handleMapSelectPlace}
            initialCenter={center}
            initialZoom={coords ? 13 : 10}
            userLocation={coords}
            selectedMunicipalityCode={
              filters.locationMode === 'municipality'
                ? filters.municipalityCode
                : undefined
            }
            selectedRailLineId={
              filters.locationMode === 'rail' ? filters.railLineId : undefined
            }
            visitCountsByPlaceId={visitCountsByPlaceId}
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
              municipalityCounts={municipalityCounts}
              railLineCounts={railLineCounts}
              open={filterOpen}
onOpenChange={(open) => {
                setFilterOpen(open);
                if (open) {
                  setSearchOpen(false);
                  setSheetCollapsed(true);
                }
              }}
              setCategory={setCategory}
              setIndoorOutdoor={setIndoorOutdoor}
              setLocationMode={setLocationMode}
              setRadius={setRadius}
              setMunicipality={setMunicipality}
              setRailLine={setRailLine}
              toggleTag={toggleTag}
            />
          </div>
{searchOpen ? (
            <label className="pointer-events-auto flex w-40 min-w-0 shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-3 shadow-md transition">
              <span className="shrink-0 text-gray-500">
                <SearchLineIcon />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                value={searchDraft}
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                  setQuery(event.target.value);
                }}
                onFocus={() => {
                  setFilterOpen(false);
                  setSheetCollapsed(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setSearchDraft('');
                    setQuery('');
                    setSearchOpen(false);
                  }
                }}
                onBlur={() => {
                  if (!searchDraft) setSearchOpen(false);
                }}
                placeholder={t('places.searchPlaceholder')}
                aria-label={t('places.searchAriaLabel')}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
              />
              {searchDraft && (
                <button
                  type="button"
                  aria-label={t('places.clearSearch')}
                  onClick={() => {
                    setSearchDraft('');
                    setQuery('');
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600 transition hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5 fill-none stroke-current"
                  >
                    <path
                      d="M5 5l10 10M15 5L5 15"
                      strokeLinecap="round"
                      strokeWidth="2.6"
                    />
                  </svg>
                </button>
              )}
            </label>
          ) : (
            <button
              type="button"
              aria-label={t('places.searchAriaLabel')}
              aria-expanded={searchOpen}
              onClick={() => {
                setFilterOpen(false);
                setSheetCollapsed(true);
                setSearchOpen(true);
              }}
              className="pointer-events-auto relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-800 bg-brand-700 text-white shadow-md transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <SearchLineIcon />
              {searchDraft && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-brand-800"
                />
              )}
            </button>
          )}
          <button
            type="button"
            aria-label={t('places.locate')}
            onClick={request}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-800 bg-brand-700 text-white shadow-md transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <LocationLineIcon />
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
            {getPlaceIcon(place)}
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
