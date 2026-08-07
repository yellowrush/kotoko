import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  'other',
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
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white text-gray-600'
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

export function PlaceFilterChips({
  filters,
  resultCount,
  setCategory,
  setIndoorOutdoor,
  setRadius,
  toggleTag,
}: PlaceFilterChipsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md"
      >
        <span aria-hidden>⚲</span>
        <span>{t('places.filters.label')}</span>
        {resultCount > 0 && (
          <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
            {resultCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={t('common.collapse')}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[5] cursor-default"
          />
          <div className="absolute left-0 top-full z-[6] mt-2 flex w-[min(92vw,24rem)] flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
            <ChipGroup title={t('places.filters.sectionCategory')}>
              {CATEGORY_GROUPS.map(({ group, categories }) => (
                <div key={group} className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-gray-400">{t(`places.groups.${group}`)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <Chip
                        key={cat}
                        active={filters.category === cat}
                        onClick={() => setCategory(filters.category === cat ? undefined : cat)}
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
                    setIndoorOutdoor(filters.indoorOutdoor === opt.value ? undefined : opt.value)
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
                  onClick={() => setRadius(filters.radiusKm === r.value ? undefined : r.value)}
                >
                  {t(`places.filters.${r.key}`)}
                </Chip>
              ))}
            </ChipGroup>

            <ChipGroup title={t('places.filters.sectionTags')}>
              {TAGS.map((tag) => (
                <Chip key={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
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