import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateAgeMonths } from '@kodoko/domain';
import { PlacesMap } from '../components/places/PlacesMap';
import { PlaceFilterChips } from '../components/places/PlaceFilterChips';
import { PlaceBottomSheet } from '../components/places/PlaceBottomSheet';
import { usePlaces, usePlacesFilters } from '../hooks/usePlaces';
import { useGeolocation, DEFAULT_CENTER } from '../hooks/useGeolocation';
import { useActiveChild } from '../hooks/useActiveChild';
import { filterPlaces } from '../lib/placeFilters';

export function PlacesMapPage() {
  const { t } = useTranslation();
  const { data: places, isLoading, isError, refetch } = usePlaces();
  const { filters, setCategory, setIndoorOutdoor, setRadius, setPlaceId, toggleTag } = usePlacesFilters();
  const { status, coords, requested, request } = useGeolocation();
  const { active } = useActiveChild();
  const [tileError, setTileError] = useState(false);

  const ageMonths = active ? calculateAgeMonths(active.birthDate) : undefined;

  const filtered = useMemo(
    () => filterPlaces(places ?? [], { ...filters, userLocation: coords ?? undefined }, ageMonths),
    [places, filters, coords, ageMonths],
  );

  const center = coords ?? DEFAULT_CENTER;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">{t('loading')}</div>;
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <p>{t('common.error')}</p>
        <button type="button" onClick={() => void refetch()} className="text-brand-700">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <PlacesMap
          places={filtered}
          selectedPlaceId={filters.placeId}
          onSelectPlace={setPlaceId}
          initialCenter={center}
          initialZoom={coords ? 13 : 10}
          userLocation={coords}
          onStyleError={() => setTileError(true)}
        />

        {tileError && (
          <p className="absolute left-3 top-16 z-[6] max-w-[60%] rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
            {t('places.mapTilesUnavailable')}
          </p>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex flex-col gap-2 bg-gradient-to-b from-black/40 to-transparent p-3 pb-8">
          <div className="pointer-events-auto">
            <PlaceFilterChips
              filters={filters}
              setCategory={setCategory}
              setIndoorOutdoor={setIndoorOutdoor}
              setRadius={setRadius}
              toggleTag={toggleTag}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={request}
          className="absolute right-3 top-16 z-[6] flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md"
        >
          <span aria-hidden>📍</span>
          {t('places.locate')}
        </button>
        {requested && status === 'denied' && (
          <p className="absolute bottom-2 left-3 z-[6] rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
            {t('places.locationDenied')}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-12">
        <PlaceBottomSheet
          places={filtered}
          selectedPlaceId={filters.placeId}
          onSelect={setPlaceId}
          total={filtered.length}
        />
      </div>
    </div>
  );
}
