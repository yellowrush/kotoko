import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALES, normalizeLocale } from '@kodoko/i18n';
import { Button } from '@kodoko/ui';
import { useAppStore } from '../store/appStore';
import { changeLocale } from '../app/i18n';
import { exportLocalData, importLocalData } from '../lib/backup';
import { PageHeader } from '../components/PageHeader';

export function SettingsPage() {
  const { t } = useTranslation();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const [message, setMessage] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    await exportLocalData();
    setMessage('exported');
  }, []);

  const onImport = useCallback(async (file: File) => {
    try {
      const created = await importLocalData(file);
      setMessage(`imported ${created}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'error');
    }
  }, []);

  const onDeleteAll = useCallback(async () => {
    await deleteLocalData();
    setMessage('deleted');
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('settings.title')} />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('settings.language')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLocale(code);
                void changeLocale(code);
              }}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                normalizeLocale(locale) === code
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('settings.localData')}</h2>
        <p className="mt-2 text-xs text-gray-500">{t('settings.localDataNotice')}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button onClick={() => void onExport()}>{t('settings.export')}</Button>
          <label className="flex w-full cursor-pointer">
            <span className="sr-only">{t('settings.import')}</span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImport(file);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" className="pointer-events-none w-full">
              {t('settings.import')}
            </Button>
          </label>
          <Button variant="danger" onClick={() => void onDeleteAll()}>
            {t('settings.deleteAll')}
          </Button>
        </div>
        {message && <p className="mt-2 text-xs text-gray-400">{message}</p>}
      </section>
    </div>
  );
}

async function deleteLocalData(): Promise<void> {
  const { getDb } = await import('../lib/db');
  const db = getDb();
  await Promise.all([
    db.children.clear(),
    db.preferences.clear(),
    db.favorites.clear(),
    db.knowledgeProgress.clear(),
    db.policyTasks.clear(),
  ]);
}