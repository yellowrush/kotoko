import React from 'react';
import ReactDOM from 'react-dom/client';
import { DEFAULT_LOCALE } from '@kodoko/i18n';
import { App } from './app/App';
import { initI18n } from './app/i18n';
import { useAppStore } from './store/appStore';
import './styles/index.css';

void initI18n().then(() => {
  useAppStore.getState().setLocale(DEFAULT_LOCALE);
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
