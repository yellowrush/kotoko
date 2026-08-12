import { useAppTranslation } from "../../hooks/useAppTranslation";
import type {
  IndoorOutdoor,
  Municipality,
  PlaceCategory,
} from "@kodoko/domain";
import { CATEGORY_GROUP, PLACE_GROUPS } from "@kodoko/domain";
import type {
  PlacesFilterState,
  PlacesLocationMode,
} from "../../hooks/usePlaces";
import {
  COMMON_MUNICIPALITY_CODES,
  MUNICIPALITY_BY_CODE,
  RAIL_LINE_OPTIONS,
  type RailLineGroup,
} from "../../lib/placeLocationOptions";

const CATEGORIES: PlaceCategory[] = [
  "park",
  "playground",
  "museum",
  "zoo",
  "aquarium",
  "library",
  "indoor-play",
  "children-hall",
  "toy-play",
  "amusement-park",
  "restaurant",
  "facility",
];

const CATEGORY_GROUPS = PLACE_GROUPS.map((group) => ({
  group,
  categories: CATEGORIES.filter((cat) => CATEGORY_GROUP[cat] === group),
})).filter((g) => g.categories.length > 0);

const INDOOR_OPTIONS: { value: IndoorOutdoor; key: string }[] = [
  { value: "indoor", key: "indoor" },
  { value: "outdoor", key: "outdoor" },
  { value: "mixed", key: "mixed" },
];

const TAGS = ["dining", "group-play"] as const;

const RADIUS = [
  { value: 3, key: "r3" },
  { value: 5, key: "r5" },
  { value: 10, key: "r10" },
  { value: 20, key: "r20" },
] as const;

const RAIL_GROUPS: RailLineGroup[] = ["jr", "subway", "private"];

type PlaceFilterChipsProps = {
  filters: PlacesFilterState;
  municipalityCounts: Record<string, number>;
  railLineCounts: Record<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setCategory: (c: string | undefined) => void;
  setIndoorOutdoor: (v: string | undefined) => void;
  setLocationMode: (mode: PlacesLocationMode) => void;
  setRadius: (r: number | undefined) => void;
  setMunicipality: (code: string | undefined) => void;
  setRailLine: (lineId: string | undefined) => void;
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
          ? "border-brand-700 bg-brand-600 text-white"
          : "border-brand-100 bg-white/95 text-gray-600 hover:bg-brand-50"
      }`}
    >
      {children}
    </button>
  );
}

function CountSuffix({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-[11px] font-bold"
    >
      {count}
    </span>
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

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-bold transition ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-white text-gray-600 hover:bg-brand-50"
      }`}
    >
      {icon}
      <span className="min-w-0 whitespace-nowrap">{children}</span>
    </button>
  );
}

function LocationModeIcon({ mode }: { mode: PlacesLocationMode }) {
  if (mode === "near") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 fill-none stroke-current"
      >
        <circle cx="12" cy="12" r="6.5" strokeWidth="2" />
        <path
          d="M12 3v3M12 18v3M3 12h3M18 12h3"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    );
  }

  if (mode === "municipality") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 fill-none stroke-current"
      >
        <path
          d="M6.5 5.5 17 4l2.5 6-3 8.5-9.5 1L4 13z"
          strokeDasharray="3 2"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path d="M9 10h6M8 14h4" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 fill-none stroke-current"
    >
      <rect x="6" y="4" width="12" height="14" rx="3" strokeWidth="2" />
      <path
        d="M9 8h6M9 12h6M9 21l2-3M15 21l-2-3"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="9.5" cy="15" r="1.3" fill="currentColor" />
      <circle cx="14.5" cy="15" r="1.3" fill="currentColor" />
    </svg>
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
  municipalityCounts,
  railLineCounts,
  open,
  onOpenChange,
  setCategory,
  setIndoorOutdoor,
  setLocationMode,
  setRadius,
  setMunicipality,
  setRailLine,
  toggleTag,
}: PlaceFilterChipsProps) {
  const { t } = useAppTranslation();
  const commonMunicipalities = COMMON_MUNICIPALITY_CODES.reduce<Municipality[]>(
    (items, code) => {
      const municipality = MUNICIPALITY_BY_CODE.get(code);
      if (!municipality) return items;
      if (
        (municipalityCounts[municipality.code] ?? 0) > 0 ||
        filters.municipalityCode === municipality.code
      ) {
        items.push(municipality);
      }
      return items;
    },
    [],
  );
  const commonCodes = new Set(commonMunicipalities.map((item) => item.code));
  const allMunicipalities = [...MUNICIPALITY_BY_CODE.values()].filter(
    (municipality) =>
      !commonCodes.has(municipality.code) &&
      ((municipalityCounts[municipality.code] ?? 0) > 0 ||
        filters.municipalityCode === municipality.code),
  );
  const railLinesByGroup = RAIL_GROUPS.map((group) => ({
    group,
    lines: RAIL_LINE_OPTIONS.filter(
      (line) =>
        line.group === group &&
        ((railLineCounts[line.id] ?? 0) > 0 || filters.railLineId === line.id),
    ),
  })).filter((item) => item.lines.length > 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={t("places.filters.label")}
        aria-expanded={open}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 text-brand-800 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
          open
            ? "border-brand-800 bg-brand-100 shadow-inner"
            : "border-brand-200 bg-brand-50 hover:bg-brand-100"
        }`}
      >
        <FilterLineIcon />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={t("common.collapse")}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[20] cursor-default"
          />
          <div className="kodoko-panel absolute left-0 top-full z-[30] mt-2 flex max-h-[min(70vh,28rem)] w-[min(92vw,24rem)] flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
            <ChipGroup title={t("places.filters.sectionLocation")}>
              <div className="grid w-full grid-cols-3 gap-1 rounded-full border border-brand-100 bg-brand-50 p-1">
                {(["near", "municipality", "rail"] as const).map((mode) => (
                  <ModeButton
                    key={mode}
                    active={filters.locationMode === mode}
                    onClick={() => setLocationMode(mode)}
                    icon={<LocationModeIcon mode={mode} />}
                  >
                    {t(`places.filters.locationModes.${mode}`)}
                  </ModeButton>
                ))}
              </div>
            </ChipGroup>

            {filters.locationMode === "near" && (
              <ChipGroup title={t("places.filters.sectionRadius")}>
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
            )}

            {filters.locationMode === "municipality" && (
              <>
                <ChipGroup
                  title={t("places.filters.sectionMunicipalityCommon")}
                >
                  {commonMunicipalities.map((municipality) => (
                    <Chip
                      key={municipality.code}
                      active={filters.municipalityCode === municipality.code}
                      onClick={() =>
                        setMunicipality(
                          filters.municipalityCode === municipality.code
                            ? undefined
                            : municipality.code,
                        )
                      }
                    >
                      {municipality.nameJa}
                      <CountSuffix
                        count={municipalityCounts[municipality.code] ?? 0}
                      />
                    </Chip>
                  ))}
                </ChipGroup>

                <ChipGroup title={t("places.filters.sectionMunicipalityAll")}>
                  {allMunicipalities.map((municipality) => (
                    <Chip
                      key={municipality.code}
                      active={filters.municipalityCode === municipality.code}
                      onClick={() =>
                        setMunicipality(
                          filters.municipalityCode === municipality.code
                            ? undefined
                            : municipality.code,
                        )
                      }
                    >
                      {municipality.nameJa}
                      <CountSuffix
                        count={municipalityCounts[municipality.code] ?? 0}
                      />
                    </Chip>
                  ))}
                  {commonMunicipalities.length === 0 &&
                    allMunicipalities.length === 0 && (
                      <p className="text-sm text-gray-500">
                        {t("places.filters.emptyLocationOptions")}
                      </p>
                    )}
                </ChipGroup>
              </>
            )}

            {filters.locationMode === "rail" && (
              <>
                <p className="text-xs font-medium leading-relaxed text-gray-500">
                  {t("places.filters.railHelp")}
                </p>
                {railLinesByGroup.map(({ group, lines }) => (
                  <ChipGroup
                    key={group}
                    title={t(`places.filters.railGroups.${group}`)}
                  >
                    {lines.map((line) => (
                      <Chip
                        key={line.id}
                        active={filters.railLineId === line.id}
                        onClick={() =>
                          setRailLine(
                            filters.railLineId === line.id
                              ? undefined
                              : line.id,
                          )
                        }
                      >
                        {line.nameJa}
                        <CountSuffix count={railLineCounts[line.id] ?? 0} />
                      </Chip>
                    ))}
                  </ChipGroup>
                ))}
                {railLinesByGroup.length === 0 && (
                  <p className="text-sm text-gray-500">
                    {t("places.filters.emptyLocationOptions")}
                  </p>
                )}
              </>
            )}

            <ChipGroup title={t("places.filters.sectionCategory")}>
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

            <ChipGroup title={t("places.filters.sectionIndoorOutdoor")}>
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

            <ChipGroup title={t("places.filters.sectionTags")}>
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
