import { useState } from 'react';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { usePlaceComments } from '../../hooks/usePlaceComments';

function RoundedStar({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 stroke-current ${
        active ? 'fill-current' : 'fill-white'
      }`}
    >
      <path
        d="M12 3.6 14.4 8.5l5.4.8-3.9 3.8.9 5.4L12 16l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function Stars({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={onChange ? () => onChange(n) : undefined}
          aria-label={`${n}点`}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-2xl border-2 transition ${
            readonly
              ? 'cursor-default border-transparent bg-transparent'
              : 'border-amber-100 bg-white shadow-[0_2px_0_rgba(120,53,15,0.1)] active:translate-y-0.5'
          } ${n <= value ? 'text-amber-400' : 'text-gray-300'}`}
        >
          <RoundedStar active={n <= value} />
        </button>
      ))}
    </div>
  );
}

export function PlaceComments({ placeId }: { placeId: string }) {
  const { t } = useAppTranslation();
  const { comments, loading, add, remove } = usePlaceComments(placeId);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    await add({ rating, content: content.trim() });
    setContent('');
    setRating(5);
    setSubmitting(false);
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-700">
        {t('placeComments.title')}
      </h3>
      <p className="mt-0.5 text-xs text-gray-400">
        {t('placeComments.localOnly')}
      </p>

      <div className="kodoko-panel mt-3 p-3">
        <Stars value={rating} onChange={setRating} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('placeComments.placeholder')}
          maxLength={1000}
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-brand-100 p-2 text-sm outline-none focus:border-brand-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {content.length}/1000
          </span>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="kodoko-button kodoko-button-primary min-h-10 px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            {t('placeComments.submit')}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 animate-pulse text-sm text-gray-400">
          {t('common.loading')}
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">{t('placeComments.empty')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {comments.map((c) => (
            <li key={c.id} className="kodoko-list-item bg-gray-50/70 p-3">
              <div className="flex items-center justify-between">
                <Stars value={c.rating} readonly />
                <button
                  type="button"
                  onClick={() => void remove(c.id)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {t('placeComments.delete')}
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
