import { useCallback } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@kodoko/i18n';
import { changeLocale } from '../app/i18n';
import { useAppStore } from '../store/appStore';

export const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
];

export function useLocale() {
  const setStoreLocale = useAppStore((s) => s.setLocale);
  const locale = DEFAULT_LOCALE;

  const setLocale = useCallback(
    (_next: Locale) => {
      setStoreLocale(DEFAULT_LOCALE);
      void changeLocale(DEFAULT_LOCALE);
    },
    [setStoreLocale],
  );

  return { locale, setLocale };
}
