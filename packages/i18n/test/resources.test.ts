import { describe, expect, it } from 'vitest';
import { LOCALES, DEFAULT_LOCALE, isLocale, normalizeLocale, resources } from '../src/index';

describe('i18n resources', () => {
  it('defines all three first-release locales', () => {
    expect(LOCALES).toEqual(['ja', 'zh-CN', 'zh-TW']);
    expect(DEFAULT_LOCALE).toBe('ja');
  });

  it('each locale contains all top-level namespaces', () => {
    for (const locale of LOCALES) {
      expect(resources[locale].common).toBeTruthy();
    }
  });

  it('locales are structurally complete (no missing keys)', () => {
    const keyCount = (obj: Record<string, unknown>): number =>
      Object.keys(obj).reduce(
        (n, k) => n + (typeof obj[k] === 'object' ? keyCount(obj[k] as Record<string, unknown>) : 1),
        0,
      );
    const reference = keyCount(resources.ja.common);
    for (const locale of LOCALES) {
      expect(keyCount(resources[locale].common)).toBe(reference);
    }
  });

  it('detects and normalizes locales', () => {
    expect(isLocale('ja')).toBe(true);
    expect(isLocale('zh-TW')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(normalizeLocale(null)).toBe('ja');
    expect(normalizeLocale('ja-JP')).toBe('ja');
    expect(normalizeLocale('zh')).toBe('zh-CN');
    expect(normalizeLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(normalizeLocale('zh_Hant_TW')).toBe('zh-TW');
    expect(normalizeLocale('zh-HK')).toBe('zh-TW');
    expect(normalizeLocale('fr')).toBe('ja');
  });
});
