import { useMemo, useState } from 'react';
import type { Place } from '@kodoko/domain';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import {
  buildCopyShareText,
  buildPlaceShareData,
  buildPlaceShareTargetUrl,
  type PlaceShareTarget,
} from '../../lib/placeShare';

type WebShareNavigator = Navigator & {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
};

type CopyTarget = 'wechat' | 'instagram' | 'copy';

const WEB_SHARE_TARGETS: {
  id: PlaceShareTarget;
  icon: string;
  key: string;
}[] = [
  { id: 'facebook', icon: 'f', key: 'facebook' },
  { id: 'line', icon: 'L', key: 'line' },
  { id: 'x', icon: 'X', key: 'x' },
];

const COPY_TARGETS: {
  id: CopyTarget;
  icon: string;
  key: string;
}[] = [
  { id: 'wechat', icon: 'We', key: 'wechat' },
  { id: 'instagram', icon: 'IG', key: 'instagram' },
  { id: 'copy', icon: 'Cp', key: 'copyLink' },
];

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.append(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

export function PlaceShareButton({ place }: { place: Place }) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'copied' | 'shared' | 'unavailable' | 'error'
  >('idle');
  const shareData = useMemo(
    () => buildPlaceShareData(place, t('common.appName')),
    [place, t],
  );
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof (navigator as WebShareNavigator).share === 'function';

  async function handleNativeShare() {
    if (!canNativeShare) {
      setStatus('unavailable');
      return;
    }

    try {
      await (navigator as WebShareNavigator).share?.(shareData);
      setStatus('shared');
      setOpen(false);
    } catch {
      setStatus('idle');
    }
  }

  function handleWebShare(target: PlaceShareTarget) {
    window.open(
      buildPlaceShareTargetUrl(target, shareData),
      '_blank',
      'noopener,noreferrer',
    );
    setStatus('shared');
    setOpen(false);
  }

  async function handleCopy() {
    try {
      await copyText(buildCopyShareText(shareData));
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus('idle');
          setOpen(true);
        }}
        className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 shadow-sm hover:bg-brand-50 hover:text-brand-700"
        aria-label={t('placeShare.open')}
      >
        <span aria-hidden>↗</span>
        {t('placeShare.button')}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/35"
          />
          <div className="kodoko-panel relative z-10 w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">
                  {t('placeShare.title')}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {place.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-9 rounded-full border border-brand-100 px-3 text-sm font-semibold text-gray-500"
              >
                {t('common.close')}
              </button>
            </div>

            {canNativeShare && (
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="mt-4 flex min-h-12 w-full items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 text-left text-sm font-semibold text-brand-700"
              >
                <span>{t('placeShare.native')}</span>
                <span aria-hidden>↗</span>
              </button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {WEB_SHARE_TARGETS.map((target) => (
                <button
                  type="button"
                  key={target.id}
                  onClick={() => handleWebShare(target.id)}
                  className="flex min-h-12 items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-brand-50"
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs text-brand-700"
                  >
                    {target.icon}
                  </span>
                  {t(`placeShare.targets.${target.key}`)}
                </button>
              ))}
              {COPY_TARGETS.map((target) => (
                <button
                  type="button"
                  key={target.id}
                  onClick={() => void handleCopy()}
                  className="flex min-h-12 items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-brand-50"
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs text-brand-700"
                  >
                    {target.icon}
                  </span>
                  {t(`placeShare.targets.${target.key}`)}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              {t('placeShare.copyHint')}
            </p>
            {status !== 'idle' && (
              <p
                className="mt-2 text-xs font-medium text-brand-700"
                role="status"
              >
                {t(`placeShare.status.${status}`)}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
