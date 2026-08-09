import { useRouteError } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { isDynamicImportFetchError } from '../lib/staleAssets';

export function RouteErrorFallback() {
  const error = useRouteError();
  const { t } = useAppTranslation();
  const staleAssetError = isDynamicImportFetchError(error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold text-gray-900">{t('common.error')}</h1>
      <p className="max-w-sm text-sm text-gray-500">
        {staleAssetError ? t('common.appUpdateAvailable') : t('common.tryAgainLater')}
      </p>
      <button
        type="button"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        onClick={() => window.location.reload()}
      >
        {t('common.retry')}
      </button>
    </main>
  );
}
