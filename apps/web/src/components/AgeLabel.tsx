import { calculateAgeMonths, formatAgeInMonths } from '@kodoko/domain';
import { useLocale } from '../hooks/useLocale';

export function AgeLabel({ birthDate }: { birthDate: string }) {
  const { locale } = useLocale();
  const total = calculateAgeMonths(birthDate);
  return <>{formatAgeInMonths(total, locale)}</>;
}
