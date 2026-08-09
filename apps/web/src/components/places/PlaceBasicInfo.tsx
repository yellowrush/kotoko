import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { Place } from '@kodoko/domain';

type PlaceBasicInfoProps = {
  place: Place;
};

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-gray-400">{label}</dt>
      <dd className="text-right text-gray-700">{children}</dd>
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

export function PlaceBasicInfo({ place }: PlaceBasicInfoProps) {
  const { t, locale } = useAppTranslation();

  const description =
    locale === 'ja'
      ? place.description
      : (place.descriptionZh ?? place.description);

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
          <InfoRow label={t('places.address')}>
            <a
              href={mapsUrl(place)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center text-brand-700"
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
          {place.parking !== undefined && (
            <InfoRow label={t('places.parking')}>
              {place.parking ? t('places.parkingYes') : t('places.parkingNo')}
            </InfoRow>
          )}
          {place.phone && (
            <InfoRow label={t('places.phone')}>
              <a
                href={`tel:${place.phone}`}
                className="inline-flex min-h-10 items-center text-brand-700"
              >
                {place.phone}
              </a>
            </InfoRow>
          )}
          {place.accessInfo && (
            <InfoRow label={t('places.access')}>{place.accessInfo}</InfoRow>
          )}
        </dl>
      </section>
    </div>
  );
}
