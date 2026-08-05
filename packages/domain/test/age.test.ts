import { describe, it, expect } from 'vitest';
import { calculateAgeMonths, calculateAge, isValidBirthDate, formatAgeInMonths } from '../src/age';

describe('calculateAgeMonths', () => {
  it('computes exact month difference', () => {
    expect(calculateAgeMonths('2024-01-01', new Date('2025-05-01'))).toBe(16);
  });

  it('returns 0 for future birth dates', () => {
    expect(calculateAgeMonths('2026-01-01', new Date('2025-05-01'))).toBe(0);
  });

  it('handles leap year birthday Feb 29', () => {
    // born 2020-02-29, celebrate on Feb 28 in non-leap years
    expect(calculateAgeMonths('2020-02-29', new Date('2021-03-01'))).toBe(12);
    expect(calculateAgeMonths('2020-02-29', new Date('2021-02-26'))).toBe(11);
    // by Feb 28 2021 the child is 12 months old (month boundary reached)
    expect(calculateAgeMonths('2020-02-29', new Date('2021-02-28'))).toBe(12);
  });

  it('does not increment birthday month until day passes', () => {
    // born Jan 15 -> on Feb 14 is 0 months, on Feb 15 is 1 month
    expect(calculateAgeMonths('2023-01-15', new Date('2023-02-14'))).toBe(0);
    expect(calculateAgeMonths('2023-01-15', new Date('2023-02-15'))).toBe(1);
  });

  it('clamps end-of-month birthdays (Jan 31 -> Feb 28/29)', () => {
    // born Jan 31, 2023. As of Feb 28 2023 the child is considered 1 month old.
    expect(calculateAgeMonths('2023-01-31', new Date('2023-02-28'))).toBe(1);
    expect(calculateAgeMonths('2023-01-31', new Date('2023-03-01'))).toBe(1);
    expect(calculateAgeMonths('2023-01-31', new Date('2023-03-31'))).toBe(2);
  });

  it('is independent of timezone by using date components', () => {
    // 2023-06-15T23:30Z vs JST would be Jun 16; must still be based on local date components
    expect(calculateAgeMonths('2023-01-15', new Date('2023-06-15T23:30:00Z'))).toBe(5);
  });

  it('respects timezone boundaries near birthday', () => {
    expect(calculateAgeMonths('2023-05-20', new Date('2023-06-20T00:00:00Z'))).toBe(1);
  });
});

describe('calculateAge', () => {
  it('breaks down into years and months', () => {
    expect(calculateAge('2021-03-10', new Date('2024-05-10'))).toEqual({
      totalMonths: 38,
      years: 3,
      months: 2,
    });
  });
});

describe('formatAgeInMonths', () => {
  it('formats in Japanese by default', () => {
    expect(formatAgeInMonths(38)).toBe('3歳2ヶ月');
    expect(formatAgeInMonths(9)).toBe('9ヶ月');
  });

  it('localizes for zh-CN and zh-TW', () => {
    expect(formatAgeInMonths(38, 'zh-CN')).toBe('3岁2个月');
    expect(formatAgeInMonths(9, 'zh-CN')).toBe('9个月');
    expect(formatAgeInMonths(38, 'zh-TW')).toBe('3歲2個月');
    expect(formatAgeInMonths(9, 'zh-TW')).toBe('9個月');
  });

  it('falls back to Japanese for unknown locales', () => {
    expect(formatAgeInMonths(15, 'fr')).toBe('1歳3ヶ月');
  });
});

describe('isValidBirthDate', () => {
  it('accepts valid calendar dates', () => {
    expect(isValidBirthDate('2020-02-29')).toBe(true);
    expect(isValidBirthDate('2005-12-01')).toBe(true);
  });

  it('rejects invalid dates and formats', () => {
    expect(isValidBirthDate('2021-02-29')).toBe(false);
    expect(isValidBirthDate('2020-13-01')).toBe(false);
    expect(isValidBirthDate('2020-00-10')).toBe(false);
    expect(isValidBirthDate('2020/01/01')).toBe(false);
    expect(isValidBirthDate('not-a-date')).toBe(false);
  });
});