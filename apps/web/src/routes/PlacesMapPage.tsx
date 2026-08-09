import { lazy, Suspense, useMemo, useState } from 'react';
import { calculateAgeMonths } from '@kodoko/domain';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { PlaceFilterChips } from '../components/places/PlaceFilterChips';
import { PlaceBottomSheet } from '../components/places/PlaceBottomSheet';
import { usePlaces, usePlacesFilters } from '../hooks/usePlaces';
import { DEFAULT_CENTER, useGeolocation } from '../hooks/useGeolocation';
import { useActiveChild } from '../hooks/useActiveChild';
import { filterPlaces } from '../lib/placeFilters';

const PlacesMap = lazy(() =>
  import('../components/places/PlacesMap').then((mod) => ({ default: mod.PlacesMap })),
);

export function PlacesMapPage() {
  const { t } = useAppTranslation();
  const { data: places, isLoading, isError, refetch } = usePlaces();
  const { filters, setCategory, setIndoorOutdoor, setRadius, setPlaceId, toggleTag } = usePlacesFilters();
  const { status, coords, requested, request } = useGeolocation();
  const { active } = useActiveChild();
  const [tileError, setTileError] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  const ageMonths = active ? calculateAgeMonths(active.birthDate) : undefined;

  const filtered = useMemo(
    () => filterPlaces(places ?? [], { ...filters, userLocation: coords ?? DEFAULT_CENTER }, ageMonths),
    [places, filters, coords, ageMonths],
  );

  const center = coords ?? DEFAULT_CENTER;

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
        <button type="button" onClick={() => void refetch()} className="text-brand-700">
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
            className="pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-md"
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

      <div className="z-10 bg-white pb-12">
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
    </div>
  );
}
