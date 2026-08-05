import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FilteredPlace } from '../../lib/placeFilters';
import { formatDistanceKm } from '../../lib/placeFilters';
import { CATEGORY_ICON } from './categoryMeta';

type PlaceBottomSheetProps = {
  places: FilteredPlace[];
  selectedPlaceId?: string;
  onSelect: (id: string) => void;
  total?: number;
};

export function PlaceBottomSheet({ places, selectedPlaceId, onSelect, total }: PlaceBottomSheetProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...places].sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    return 0;
  });

  return (
    <div className="pointer-events-auto flex flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between px-4 py-2"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          <span className="h-1 w-8 rounded-full bg-gray-300" />
          <span className="text-sm font-medium text-gray-700">
            {total !== undefined ? t('places.spotsNear', { count: total }) : t('places.spots')}
          </span>
        </span>
        <span className="text-xs text-gray-400">{collapsed ? t('common.expand') : t('common.collapse')}</span>
      </button>

      {!collapsed && (
        <div className="max-h-56 overflow-y-auto px-4 pb-4">
          {sorted.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">{t('places.noPlacesInRange')}</p>
          )}
          <ul className="flex flex-col gap-2">
            {sorted.map((place, index) => {
              const active = place.id === selectedPlaceId;
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(place.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{place.name}</span>
                          {place.distanceKm !== null && (
                            <span className="shrink-0 text-xs text-gray-400">
                              {formatDistanceKm(place.distanceKm)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <span>{CATEGORY_ICON[place.category]}</span>
                          <span>{t(`places.categories.${place.category}`)}</span>
                          {!place.ageSuitable && (
                            <span className="ml-1 text-amber-600">{t('places.notAgeSuitable')}</span>
                          )}
                        </p>
                      </div>
                      <Link
                        to={`/places/${place.id}`}
                        className="shrink-0 text-xs font-medium text-brand-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('common.details')}
                      </Link>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}