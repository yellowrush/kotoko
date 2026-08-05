import ja from './locales/ja/common.json';
import zhCN from './locales/zh-CN/common.json';
import zhTW from './locales/zh-TW/common.json';

export const LOCALES = ['ja', 'zh-CN', 'zh-TW'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ja';

export const resources = {
  ja: { common: ja },
  'zh-CN': { common: zhCN },
  'zh-TW': { common: zhTW },
} as const;

export type LocaleResources = typeof resources;

export function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (isLocale(value)) return value;
  return DEFAULT_LOCALE;
}