import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { FilteredPlace } from '../../lib/placeFilters';
import { formatDistanceKm } from '../../lib/placeFilters';
import { CATEGORY_ICON } from './categoryMeta';

type PlaceBottomSheetProps = {
  places: FilteredPlace[];
  selectedPlaceId?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
};

export function PlaceBottomSheet({
  places,
  selectedPlaceId,
  collapsed,
  onToggleCollapsed,
  onSelect,
}: PlaceBottomSheetProps) {
  const { t } = useAppTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const suppressScrollRef = useRef(false);

  useEffect(() => {
    const suppress = suppressScrollRef.current;
    suppressScrollRef.current = false;
    if (!selectedPlaceId || suppress) return;
    const scroller = listRef.current;
    if (!scroller) return;
    const item = scroller.querySelector<HTMLElement>(
      `[data-place-id="${selectedPlaceId}"]`,
    );
    if (!item) return;
    item.scrollIntoView({ block: 'start' });
  }, [selectedPlaceId]);

  const sorted = [...places].sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null)
      return a.distanceKm - b.distanceKm;
    return 0;
  });

  return (
    <div className="pointer-events-auto flex flex-col rounded-t-[1.75rem] border-2 border-b-0 border-brand-200 bg-white/95 shadow-[0_-7px_0_rgba(249,95,20,0.1),0_-20px_34px_rgba(120,53,15,0.18)] backdrop-blur">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-left focus-visible:outline-brand-600"
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('common.expand') : t('common.collapse')}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="h-1.5 w-10 shrink-0 rounded-full bg-brand-200" />
          <span className="min-w-0 truncate text-base font-semibold text-gray-900">
            {t('places.spotsNear')}
          </span>
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-200 bg-brand-50 text-lg text-brand-700 shadow-[0_2px_0_rgba(249,95,20,0.14)]"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
          >
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {!collapsed && (
        <div
          ref={listRef}
          className="max-h-[min(48vh,22rem)] overflow-y-auto px-3 pb-4"
        >
          {sorted.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              {t('places.noPlacesInRange')}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {sorted.map((place) => {
              const active = place.id === selectedPlaceId;
              return (
                <li
                  key={place.id}
                  data-place-id={place.id}
                  className={`kodoko-list-item flex items-start gap-2 p-3 transition ${
                    active
                      ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-100'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      suppressScrollRef.current = true;
                      onSelect(place.id);
                    }}
                    className={`min-w-0 flex-1 rounded-xl text-left transition focus-visible:outline-brand-600 ${
                      active ? 'bg-transparent' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {place.name}
                      </span>
                      {place.distanceKm !== null && (
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatDistanceKm(place.distanceKm)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                      <span>{CATEGORY_ICON[place.category]}</span>
                      <span>{t(`places.categories.${place.category}`)}</span>
                      {!place.ageSuitable && (
                        <span className="ml-1 text-amber-600">
                          {t('places.notAgeSuitable')}
                        </span>
                      )}
                    </p>
                  </button>
                  <Link
                    to={`/places/${place.id}`}
                    state={{ backTo: '/places' }}
                    aria-label={`${t('common.details')}: ${place.name}`}
                    className={`inline-flex min-h-10 min-h-11 shrink-0 items-center justify-center rounded-full border border-brand-200 px-4 text-sm font-semibold text-brand-700 shadow-sm transition focus-visible:outline-brand-600 ${
                      active
                        ? 'border-brand-300 bg-transparent'
                        : 'border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50'
                    }`}
                  >
                    {t('common.details')}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
