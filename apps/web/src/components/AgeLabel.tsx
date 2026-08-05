import { calculateAgeMonths, formatAgeInMonths } from '@kodoko/domain';
import { useAppStore } from '../store/appStore';

export function AgeLabel({ birthDate }: { birthDate: string }) {
  const locale = useAppStore((s) => s.locale);
  const total = calculateAgeMonths(birthDate);
  return <>{formatAgeInMonths(total, locale)}</>;
}