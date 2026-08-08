import { useState } from 'react';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import type { PlaceReportType } from '@kodoko/domain';
import { PLACE_REPORT_TYPES } from '@kodoko/domain';
import { submitReportWithQueue } from '../../lib/reportQueue';

export function PlaceReportDialog({
  placeId,
  open,
  onClose,
}: {
  placeId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useAppTranslation();
  const [type, setType] = useState<PlaceReportType>('business_hours');
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'queued' | 'done' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function reset() {
    setType('business_hours');
    setDetail('');
    setEmail('');
    setStatus('idle');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setStatus('idle');
    try {
      const result = await submitReportWithQueue({
        placeId,
        type,
        detail: detail.trim() || undefined,
        contactEmail: email.trim() || undefined,
      });
      setStatus(result.queued ? 'queued' : 'done');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t('common.collapse')}
        onClick={() => {
          reset();
          onClose();
        }}
        className="fixed inset-0 bg-black/40"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <h3 className="text-base font-semibold text-gray-900">{t('placeReport.title')}</h3>

        {status === 'done' || status === 'queued' ? (
          <div className="flex flex-col gap-3 py-6 text-center">
            <p className="text-sm text-gray-700">
              {status === 'queued' ? t('placeReport.queuedOffline') : t('placeReport.submitted')}
            </p>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="mx-auto rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700"
            >
              {t('placeReport.close')}
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xs text-gray-500">{t('placeReport.why')}</p>

            <label className="text-sm text-gray-700">
              <span className="text-xs font-medium text-gray-500">{t('placeReport.typeLabel')}</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlaceReportType)}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-brand-500"
              >
                {PLACE_REPORT_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {t(`placeReport.type.${rt}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-700">
              <span className="text-xs font-medium text-gray-500">{t('placeReport.detailLabel')}</span>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={t('placeReport.detailPlaceholder')}
                maxLength={2000}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-brand-500"
              />
            </label>

            <label className="text-sm text-gray-700">
              <span className="text-xs font-medium text-gray-500">{t('placeReport.emailLabel')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-brand-500"
              />
            </label>

            {status === 'error' && (
              <p className="text-xs text-rose-600">{t('placeReport.submitFailed')}</p>
            )}

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600"
              >
                {t('placeReport.close')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {t('placeReport.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
