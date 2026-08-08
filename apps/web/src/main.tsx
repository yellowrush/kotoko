import React from 'react';
import ReactDOM from 'react-dom/client';
import { normalizeLocale } from '@kodoko/i18n';
import { App } from './app/App';
import { initI18n } from './app/i18n';
import { useAppStore } from './store/appStore';
import './styles/index.css';

void initI18n().then((i18n) => {
  useAppStore.getState().setLocale(normalizeLocale(i18n.language ?? i18n.resolvedLanguage));
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
