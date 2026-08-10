import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { FilteredPlace } from '../../lib/placeFilters';
import { formatDistanceKm } from '../../lib/placeFilters';
import { getPlaceIcon } from './categoryMeta';

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
    if (collapsed || !selectedPlaceId) return;
    const suppress = suppressScrollRef.current;
    suppressScrollRef.current = false;
    if (suppress) return;
    const scroller = listRef.current;
    if (!scroller) return;
    const frame = window.requestAnimationFrame(() => {
      const item = scroller.querySelector<HTMLElement>(
        `[data-place-id="${selectedPlaceId}"]`,
      );
      if (!item) return;
      item.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [collapsed, places, selectedPlaceId]);

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
                  className={`kodoko-list-item group relative grid grid-cols-[1fr_auto] gap-3 p-3 transition ${
                    active
                      ? 'border-brand-500 bg-brand-50/85 ring-2 ring-brand-100'
                      : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      suppressScrollRef.current = true;
                      onSelect(place.id);
                    }}
                    className="min-w-0 text-left focus-visible:outline-brand-600"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base ring-1 ring-brand-100"
                        aria-hidden="true"
                      >
                        {getPlaceIcon(place)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-snug text-gray-900">
                          {place.name}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-medium text-gray-500">
                          {place.distanceKm !== null && (
                            <>
                              <span className="font-bold text-brand-700">
                                {formatDistanceKm(place.distanceKm)}
                              </span>
                              <span className="text-gray-300">/</span>
                            </>
                          )}
                          <span>
                            {t(`places.categories.${place.category}`)}
                          </span>
                          <span className="text-gray-300">/</span>
                          <span>
                            {t(`places.indoorOutdoor.${place.indoorOutdoor}`)}
                          </span>
                          {!place.ageSuitable && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                              {t('places.notAgeSuitable')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                  <Link
                    to={`/places/${place.id}`}
                    state={{ backTo: '/places' }}
                    aria-label={`${t('common.details')}: ${place.name}`}
                    className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-gray-500 shadow-[0_3px_0_rgba(120,53,15,0.08)] transition focus-visible:outline-brand-600 ${
                      active
                        ? 'border-brand-200 bg-white text-brand-700'
                        : 'border-gray-200 bg-white group-hover:border-brand-200 group-hover:text-brand-700'
                    }`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-none stroke-current"
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.7"
                      />
                    </svg>
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
