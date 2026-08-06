import { useTranslation } from 'react-i18next';
import { formatDistanceKm } from '../lib/placeFilters';

type RecommendationReasonsProps = {
  reasonCodes: string[];
  distanceKm: number | null;
};

const REASON_I18N: Record<string, { key: string; withDistance?: boolean }> = {
  age_match: { key: 'home.reasons.ageMatch' },
  age_mismatch: { key: 'home.reasons.ageMismatch' },
  weather: { key: 'home.reasons.weather' },
  indoor_outdoor: { key: 'home.reasons.indoorOutdoor' },
  facility: { key: 'home.reasons.facility' },
  interest: { key: 'home.reasons.interest' },
  group: { key: 'home.reasons.group' },
  distance: { key: 'home.reasons.distance', withDistance: true },
};

export function RecommendationReasons({ reasonCodes, distanceKm }: RecommendationReasonsProps) {
  const { t } = useTranslation();

  const visible = [...new Set(reasonCodes)].filter((code) => code in REASON_I18N);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((code) => {
        const entry = REASON_I18N[code];
        if (!entry) return null;
        const { key, withDistance } = entry;
        const label =
          code === 'distance' && withDistance && distanceKm !== null
            ? `${t(key)} ${formatDistanceKm(distanceKm)}`
            : t(key);
        return (
          <span key={code} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
            {label}
          </span>
        );
      })}
    </div>
  );
}