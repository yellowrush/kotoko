import { useCallback } from 'react';
import type { TOptions } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useLocale } from './useLocale';

export function useAppTranslation() {
  const { i18n } = useTranslation();
  const { locale } = useLocale();

  const t = useCallback(
    (key: string, options?: TOptions) => String(i18n.t(key, { ...options, lng: locale })),
    [i18n, locale],
  );

  return { t, i18n, locale };
}
