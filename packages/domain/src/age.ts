export type AgeInMonths = {
  totalMonths: number;
  years: number;
  months: number;
};

function partsOf(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${iso}`);
  return { y, m, d };
}

/**
 * 计算月龄（含闰年生日、月末与月末生日的月份进位规则）。
 * birthDate 与 asOf 均按日期的年/月/日分量计算，避免时区偏移。
 *
 * 规则：
 * - 每个"生日"为出生日；若出生日为月末（如 1月31日），则在当月没有该日时
 *   视为当月最后一天过生日（如 2月28/29日）。
 * - 到达生日当天（含）即增加一个月龄。
 */
export function calculateAgeMonths(birthDate: string, asOf: Date = new Date()): number {
  const b = partsOf(birthDate);
  const a = partsOf(asOf.toISOString().slice(0, 10));

  let total = (a.y - b.y) * 12 + (a.m - b.m);

  const asOfDaysInMonth = new Date(a.y, a.m, 0).getDate();
  const effectiveBirthday = Math.min(b.d, asOfDaysInMonth);

  if (a.d < effectiveBirthday) {
    total -= 1;
  }

  return total < 0 ? 0 : total;
}

export function calculateAge(birthDate: string, asOf: Date = new Date()): AgeInMonths {
  const totalMonths = calculateAgeMonths(birthDate, asOf);
  return {
    totalMonths,
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

const AGE_UNITS: Record<string, { years: string; months: string }> = {
  ja: { years: '歳', months: 'ヶ月' },
  'zh-CN': { years: '岁', months: '个月' },
  'zh-TW': { years: '歲', months: '個月' },
};

export type AgeLocale = 'ja' | 'zh-CN' | 'zh-TW';

export function formatAgeInMonths(totalMonths: number, locale: AgeLocale | string = 'ja'): string {
  const units = AGE_UNITS[locale] ?? { years: '歳', months: 'ヶ月' };
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years > 0) return `${years}${units.years}${months}${units.months}`;
  return `${months}${units.months}`;
}

export function isValidBirthDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [yStr, mStr, dStr] = iso.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d <= daysInMonth;
}