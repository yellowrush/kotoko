import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { IndoorOutdoor, PlaceCategory } from '@kodoko/domain';
import { CATEGORY_GROUP, PLACE_GROUPS } from '@kodoko/domain';
import type { PlacesFilterState } from '../../hooks/usePlaces';

const CATEGORIES: PlaceCategory[] = [
  'park',
  'playground',
  'museum',
  'zoo',
  'aquarium',
  'library',
  'indoor-play',
  'children-hall',
  'toy-play',
  'amusement-park',
  'restaurant',
  'event',
  'shop',
  'facility',
];

const CATEGORY_GROUPS = PLACE_GROUPS.map((group) => ({
  group,
  categories: CATEGORIES.filter((cat) => CATEGORY_GROUP[cat] === group),
})).filter((g) => g.categories.length > 0);

const INDOOR_OPTIONS: { value: IndoorOutdoor; key: string }[] = [
  { value: 'indoor', key: 'indoor' },
  { value: 'outdoor', key: 'outdoor' },
  { value: 'mixed', key: 'mixed' },
];

const TAGS = ['dining', 'group-play'] as const;

const RADIUS = [
  { value: 3, key: 'r3' },
  { value: 5, key: 'r5' },
  { value: 10, key: 'r10' },
  { value: 20, key: 'r20' },
] as const;

type PlaceFilterChipsProps = {
  filters: PlacesFilterState;
  resultCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setCategory: (c: string | undefined) => void;
  setIndoorOutdoor: (v: string | undefined) => void;
  setRadius: (r: number | undefined) => void;
  toggleTag: (t: string) => void;
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
        active
          ? 'border-brand-700 bg-brand-600 text-white'
          : 'border-brand-100 bg-white/95 text-gray-600 hover:bg-brand-50'
      }`}
    >
      {children}
    </button>
  );
}

function ChipGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterLineIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current"
    >
      <path
        d="M5 7h14M8 12h8M10 17h4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <circle cx="9" cy="7" r="1.8" fill="currentColor" />
      <circle cx="15" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="17" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function PlaceFilterChips({
  filters,
  resultCount,
  open,
  onOpenChange,
  setCategory,
  setIndoorOutdoor,
  setRadius,
  toggleTag,
}: PlaceFilterChipsProps) {
  const { t } = useAppTranslation();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={t('places.filters.label')}
        aria-expanded={open}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-brand-800 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
          open
            ? 'border-brand-800 bg-brand-100 shadow-inner'
            : 'border-brand-200 bg-brand-50 hover:bg-brand-100'
        }`}
      >
        <FilterLineIcon />
        {resultCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-white bg-brand-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {resultCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={t('common.collapse')}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[20] cursor-default"
          />
          <div className="kodoko-panel absolute left-0 top-full z-[30] mt-2 flex max-h-[min(70vh,28rem)] w-[min(92vw,24rem)] flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
            <ChipGroup title={t('places.filters.sectionCategory')}>
              {CATEGORY_GROUPS.map(({ group, categories }) => (
                <div key={group} className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-gray-400">
                    {t(`places.groups.${group}`)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <Chip
                        key={cat}
                        active={filters.category === cat}
                        onClick={() =>
                          setCategory(
                            filters.category === cat ? undefined : cat,
                          )
                        }
                      >
                        {t(`places.categories.${cat}`)}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </ChipGroup>

            <ChipGroup title={t('places.filters.sectionIndoorOutdoor')}>
              {INDOOR_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  active={filters.indoorOutdoor === opt.value}
                  onClick={() =>
                    setIndoorOutdoor(
                      filters.indoorOutdoor === opt.value
                        ? undefined
                        : opt.value,
                    )
                  }
                >
                  {t(`places.filterIndoor.${opt.key}`)}
                </Chip>
              ))}
            </ChipGroup>

            <ChipGroup title={t('places.filters.sectionRadius')}>
              {RADIUS.map((r) => (
                <Chip
                  key={r.key}
                  active={filters.radiusKm === r.value}
                  onClick={() =>
                    setRadius(
                      filters.radiusKm === r.value ? undefined : r.value,
                    )
                  }
                >
                  {t(`places.filters.${r.key}`)}
                </Chip>
              ))}
            </ChipGroup>

            <ChipGroup title={t('places.filters.sectionTags')}>
              {TAGS.map((tag) => (
                <Chip
                  key={tag}
                  active={filters.tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  {t(`places.tags.${tag}`)}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        </>
      )}
    </div>
  );
}
