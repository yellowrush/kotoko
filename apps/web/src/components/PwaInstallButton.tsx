import { useAppTranslation } from '../hooks/useAppTranslation';
import { usePwaInstallPrompt } from '../hooks/usePwaInstallPrompt';

export function PwaInstallButton() {
  const { t } = useAppTranslation();
  const { canInstall, install } = usePwaInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      aria-label={t('common.installApp')}
      className="kodoko-button kodoko-button-secondary min-h-9 shrink-0 px-3 py-1.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      onClick={() => {
        void install();
      }}
    >
      {t('common.installApp')}
    </button>
  );
}
