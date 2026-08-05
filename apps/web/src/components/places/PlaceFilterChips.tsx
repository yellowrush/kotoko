import { useTranslation } from 'react-i18next';
import type { IndoorOutdoor, PlaceCategory } from '@kodoko/domain';
import type { PlacesFilterState } from '../../hooks/usePlaces';

const CATEGORIES: PlaceCategory[] = [
  'park',
  'playground',
  'museum',
  'zoo',
  'aquarium',
  'library',
  'indoor-play',
  'restaurant',
  'event',
  'facility',
];

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
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-gray-300 bg-white text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

export function PlaceFilterChips({
  filters,
  setCategory,
  setIndoorOutdoor,
  setRadius,
  toggleTag,
}: PlaceFilterChipsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4">
        <Chip active={!filters.category} onClick={() => setCategory(undefined)}>
          {t('places.filters.all')}
        </Chip>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            active={filters.category === cat}
            onClick={() => setCategory(filters.category === cat ? undefined : cat)}
          >
            {t(`places.categories.${cat}`)}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {INDOOR_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            active={filters.indoorOutdoor === opt.value}
            onClick={() => setIndoorOutdoor(filters.indoorOutdoor === opt.value ? undefined : opt.value)}
          >
            {t(`places.filterIndoor.${opt.key}`)}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <Chip active={!filters.radiusKm} onClick={() => setRadius(undefined)}>
          {t('places.filters.allArea')}
        </Chip>
        {RADIUS.map((r) => (
          <Chip
            key={r.key}
            active={filters.radiusKm === r.value}
            onClick={() => setRadius(filters.radiusKm === r.value ? undefined : r.value)}
          >
            {t(`places.filters.${r.key}`)}
          </Chip>
        ))}
      </div>
      <div className="flex gap-1.5">
        {TAGS.map((tag) => (
          <Chip key={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
            {t(`places.tags.${tag}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
}