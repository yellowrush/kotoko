import { create } from 'zustand';
import { DEFAULT_LOCALE, type Locale } from '@kodoko/i18n';

type AppState = {
  locale: Locale;
  currentChildId: string | null;
  setLocale: (locale: Locale) => void;
  setCurrentChildId: (id: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  locale: DEFAULT_LOCALE,
  currentChildId: null,
  setLocale: (locale) => set({ locale }),
  setCurrentChildId: (currentChildId) => set({ currentChildId }),
}));