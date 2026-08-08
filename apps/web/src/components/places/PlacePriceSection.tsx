import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { Place } from '@kodoko/domain';

type PlacePriceSectionProps = {
  place: Place;
};

export function PlacePriceSection({ place }: PlacePriceSectionProps) {
  const { t, locale } = useAppTranslation();
  const prices = place.prices ?? [];
  const first = prices[0];

  if (prices.length > 0 && first) {
    return (
      <div className="mt-4 rounded-xl border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-700">{t('places.priceTitle')}</h3>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {prices.map((price) => (
            <li key={price.id} className="flex items-baseline justify-between gap-2 py-1.5">
              <span className="text-gray-600">
                {price.labelJa}
                {price.note ? <span className="ml-1 text-xs text-gray-400">{`(${price.note})`}</span> : null}
              </span>
              <span className="font-medium text-gray-800">
                {price.free || price.amountYen === undefined
                  ? t('places.free')
                  : `￥${price.amountYen.toLocaleString()}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            {t('places.priceUpdatedAt', {
              date: new Date(first.checkedAt).toLocaleDateString(locale),
            })}
          </span>
          <a
            href={first.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700"
          >
            {t('places.priceSource')}
          </a>
        </p>
        <p className="mt-1 text-xs text-gray-400">{t('places.priceDisclaimer')}</p>
      </div>
    );
  }

  if (place.priceLevel !== undefined) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        {t('places.priceLabel')}: {place.priceLevel > 0 ? '￥'.repeat(place.priceLevel) : t('places.free')}
      </p>
    );
  }

  return null;
}
