import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources, DEFAULT_LOCALE, normalizeLocale, type Locale } from '@kodoko/i18n';

let initialized = false;

export async function initI18n(): Promise<typeof i18n> {
  if (initialized) return i18n;
  initialized = true;

  await i18n.use(LanguageDetector).use(initReactI18next).init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    supportedLngs: ['ja', 'zh-CN', 'zh-TW'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      convertDetectedLanguage: normalizeLocale,
    },
  });

  return i18n;
}

export function changeLocale(locale: Locale) {
  return i18n.changeLanguage(locale);
}

export { i18n };
