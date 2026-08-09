import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, DEFAULT_LOCALE, type Locale } from '@kodoko/i18n';

let initialized = false;

export async function initI18n(): Promise<typeof i18n> {
  if (initialized) return i18n;
  initialized = true;

  await i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    supportedLngs: ['ja', 'zh-CN', 'zh-TW'],
    interpolation: { escapeValue: false },
  });

  return i18n;
}

export function changeLocale(_locale: Locale) {
  return i18n.changeLanguage(DEFAULT_LOCALE);
}

export { i18n };
