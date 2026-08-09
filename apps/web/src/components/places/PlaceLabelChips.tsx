import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { Place, PlaceLabel } from '@kodoko/domain';
import { LABEL_ICON } from './categoryMeta';

const LOCATION_LABELS: PlaceLabel[] = ['indoor', 'outdoor', 'mixed'];

type PlaceLabelChipsProps = {
  place: Place;
  showLocation?: boolean;
};

export function PlaceLabelChips({
  place,
  showLocation = true,
}: PlaceLabelChipsProps) {
  const { t } = useAppTranslation();

  const labels = showLocation
    ? place.labels
    : place.labels.filter((label) => !LOCATION_LABELS.includes(label));

  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="kodoko-badge inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800"
        >
          <span aria-hidden>{LABEL_ICON[label]}</span>
          {t(`places.labels.${label}`)}
        </span>
      ))}
    </div>
  );
}
