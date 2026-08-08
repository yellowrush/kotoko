import { useCallback } from 'react';
import { normalizeLocale, type Locale } from '@kodoko/i18n';
import { changeLocale } from '../app/i18n';
import { getPreferenceRepository } from '../lib/db';
import { useAppStore } from '../store/appStore';

export const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
];

export function useLocale() {
  const storeLocale = useAppStore((s) => s.locale);
  const setStoreLocale = useAppStore((s) => s.setLocale);
  const locale = storeLocale;

  const setLocale = useCallback(
    (next: Locale) => {
      const localeToSave = normalizeLocale(next);
      setStoreLocale(localeToSave);
      void changeLocale(localeToSave);
      void getPreferenceRepository().set({ locale: localeToSave });
    },
    [setStoreLocale],
  );

  return { locale, setLocale };
}
