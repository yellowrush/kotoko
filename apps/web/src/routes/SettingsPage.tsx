import { useCallback, useState } from 'react';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { Button } from '@kodoko/ui';
import type { ImportMode } from '@kodoko/local-db';
import { deleteLocalData, exportLocalData, importLocalData } from '../lib/backup';
import { usePreference } from '../hooks/usePreference';
import { LANGUAGE_OPTIONS, useLocale } from '../hooks/useLocale';
import { MUNICIPALITIES, type IndoorOutdoor } from '@kodoko/domain';
import { PageHeader } from '../components/PageHeader';

const RADIUS_OPTIONS: Array<number | undefined> = [undefined, 3, 5, 10, 20];
const INDOOR_OUTDOOR_OPTIONS: Array<IndoorOutdoor | undefined> = [
  undefined,
  'indoor',
  'outdoor',
  'mixed',
];

export function SettingsPage() {
  const { t } = useAppTranslation();
  const { locale, setLocale } = useLocale();
  const {
    preference,
    setMunicipality,
    setRadiusKm,
    setIndoorOutdoorPreference,
  } = usePreference();
  const [message, setMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');

  const onExport = useCallback(async () => {
    await exportLocalData();
    setMessage('exported');
  }, []);

  const onImport = useCallback(
    async (file: File) => {
      try {
        const created = await importLocalData(file, importMode);
        setMessage(`imported ${created}`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'error');
      }
    },
    [importMode],
  );

  const onDeleteAll = useCallback(async () => {
    await deleteLocalData();
    setMessage('deleted');
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('settings.title')} backTo="/home" />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('settings.language')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void setLocale(option.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                locale === option.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('settings.municipality')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('settings.municipalityNotice')}</p>
        <select
          value={preference?.municipalityCode ?? ''}
          onChange={(e) => {
            const code = e.target.value || undefined;
            void setMunicipality(code);
          }}
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t('settings.municipalityNone')}</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m.code} value={m.code}>
              {m.nameJa}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('settings.recommendation')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('settings.recommendationNotice')}</p>

        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">{t('settings.radiusKm')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((radius) => {
              const active = preference?.radiusKm === radius || (!preference?.radiusKm && radius === undefined);
              return (
                <button
                  key={radius ?? 'none'}
                  type="button"
                  onClick={() => void setRadiusKm(radius)}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {radius ? t('settings.radiusOption', { km: radius }) : t('settings.radiusNone')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">{t('settings.indoorOutdoorPreference')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDOOR_OUTDOOR_OPTIONS.map((value) => {
              const active =
                preference?.indoorOutdoorPreference === value ||
                (!preference?.indoorOutdoorPreference && value === undefined);
              return (
                <button
                  key={value ?? 'none'}
                  type="button"
                  onClick={() => void setIndoorOutdoorPreference(value)}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {t(`settings.indoorOutdoor.${value ?? 'none'}`)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('settings.localData')}</h2>
        <p className="mt-2 text-xs text-gray-500">{t('settings.localDataNotice')}</p>

        <div className="mt-3 flex gap-1">
          {(['merge', 'overwrite'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setImportMode(mode)}
              className={`flex-1 rounded-full px-3 py-1 text-xs font-medium ${
                importMode === mode ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {t(`settings.importMode.${mode}`)}
            </button>
          ))}
        </div>

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

