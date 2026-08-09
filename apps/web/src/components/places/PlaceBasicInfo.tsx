import type { ReactNode } from 'react';
import type { Place, PlaceLabel } from '@kodoko/domain';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { LABEL_ICON } from './categoryMeta';

type PlaceBasicInfoProps = {
  place: Place;
  distanceKm?: number | null;
};

const FACILITY_LABELS: PlaceLabel[] = [
  'baby-car',
  'nursing-room',
  'diaper-changing',
  'parking',
  'wheelchair',
  'dining',
  'english-ok',
  'petting',
  'water-play',
  'picnic',
];

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-gray-400">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-gray-700">
        {children}
      </dd>
    </div>
  );
}

function mapsUrl(place: Place): string {
  const query =
    place.latitude !== undefined && place.longitude !== undefined
      ? `${place.latitude},${place.longitude}`
      : place.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatAgeRange(place: Place, t: (key: string) => string): string {
  if (
    place.suitableAgeMinMonths === undefined &&
    place.suitableAgeMaxMonths === undefined
  ) {
    return t('places.allAgesLabel');
  }

  return `${place.suitableAgeMinMonths ?? 0}-${
    place.suitableAgeMaxMonths ?? ''
  } ${t('places.monthsUnit')}`;
}

function formatPriceLine(
  place: Place,
  locale: string,
  t: (key: string) => string,
): string {
  const prices = place.prices ?? [];

  if (prices.length > 0) {
    return prices
      .slice(0, 3)
      .map((price) => {
        const label =
          locale === 'ja' ? price.labelJa : (price.labelZh ?? price.labelJa);
        const amount = price.free
          ? t('places.free')
          : price.amountYen !== undefined
            ? `\u00a5${price.amountYen.toLocaleString()}`
            : t('places.priceUnknown');
        return `${label}: ${amount}`;
      })
      .join(' / ');
  }

  if (place.priceLevel !== undefined) {
    return place.priceLevel > 0
      ? '\u00a5'.repeat(place.priceLevel)
      : t('places.free');
  }

  return t('places.priceUnknown');
}

export function PlaceBasicInfo({ place, distanceKm }: PlaceBasicInfoProps) {
  const { t, locale } = useAppTranslation();

  const description =
    locale === 'ja'
      ? place.description
      : (place.descriptionZh ?? place.description);
  const facilities = FACILITY_LABELS.filter((label) =>
    place.labels.includes(label),
  );
  const priceLine = formatPriceLine(place, locale, t);
  const firstPrice = place.prices?.[0];

  return (
    <div className="flex flex-col gap-3">
      {description && (
        <section className="kodoko-panel p-3">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('places.descriptionTitle')}
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        </section>
      )}

      <section className="kodoko-panel p-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('places.basicInfo')}
        </h3>
        <dl className="mt-1 divide-y divide-gray-100">
          <InfoRow label={t('places.categoryLabel')}>
            {t(`places.categories.${place.category}`)}
          </InfoRow>
          <InfoRow label={t('places.indoorOutdoorLabel')}>
            {t(`places.indoorOutdoor.${place.indoorOutdoor}`)}
          </InfoRow>
          <InfoRow label={t('places.suitableAgeLabel')}>
            {formatAgeRange(place, t)}
          </InfoRow>
          {distanceKm !== null && distanceKm !== undefined && (
            <InfoRow label={t('home.reasons.distance')}>
              {t('places.distance', {
                distance: `${distanceKm.toFixed(1)}km`,
              })}
            </InfoRow>
          )}
          <InfoRow label={t('places.priceLabel')}>
            <span className="inline-block max-w-full break-words">
              {priceLine}
            </span>
          </InfoRow>
          {facilities.length > 0 && (
            <InfoRow label={t('home.reasons.facility')}>
              <span className="flex flex-wrap justify-end gap-1">
                {facilities.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-100"
                  >
                    <span aria-hidden>{LABEL_ICON[label]}</span>
                    {t(`places.labels.${label}`)}
                  </span>
                ))}
              </span>
            </InfoRow>
          )}
          <InfoRow label={t('places.address')}>
            <a
              href={mapsUrl(place)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-end text-brand-700"
              title={t('places.openInMap')}
            >
              {place.address}
            </a>
          </InfoRow>
          {place.businessHours && (
            <InfoRow label={t('places.businessHours')}>
              {place.businessHours}
            </InfoRow>
          )}
          {place.closedDays && (
            <InfoRow label={t('places.closedDays')}>{place.closedDays}</InfoRow>
          )}
          {place.parking !== undefined && !place.labels.includes('parking') && (
            <InfoRow label={t('places.parking')}>
              {place.parking ? t('places.parkingYes') : t('places.parkingNo')}
            </InfoRow>
          )}
          {place.phone && (
            <InfoRow label={t('places.phone')}>
              <a
                href={`tel:${place.phone}`}
                className="inline-flex min-h-10 items-center justify-end text-brand-700"
              >
                {place.phone}
              </a>
            </InfoRow>
          )}
          {place.accessInfo && (
            <InfoRow label={t('places.access')}>{place.accessInfo}</InfoRow>
          )}
        </dl>
        {firstPrice && (
          <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>
              {t('places.priceUpdatedAt', {
                date: new Date(firstPrice.checkedAt).toLocaleDateString(locale),
              })}
            </span>
            <a
              href={firstPrice.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-700"
            >
              {t('places.priceSource')}
            </a>
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {t('places.priceDisclaimer')}
        </p>
      </section>
    </div>
  );
}
