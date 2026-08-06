import { useTranslation } from 'react-i18next';
import type { Place } from '@kodoko/domain';

type PlaceReservationSectionProps = {
  place: Place;
};

export function PlaceReservationSection({ place }: PlaceReservationSectionProps) {
  const { t } = useTranslation();

  const reservation = place.reservation;
  if (!reservation) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-gray-700">{t('places.reservationTitle')}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
          {t(`places.reservationModes.${reservation.mode}`)}
        </span>
        {reservation.note && <span className="text-gray-500">{reservation.note}</span>}
      </div>
      {reservation.howToUrl && (
        <a
          href={reservation.howToUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700"
        >
          {t('places.reservationLink')} ↗
        </a>
      )}
    </div>
  );
}