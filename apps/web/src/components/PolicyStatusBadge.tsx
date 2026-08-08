import { useAppTranslation } from '../hooks/useAppTranslation';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  viewed: 'bg-sky-100 text-sky-700',
  planned: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-gray-200 text-gray-400',
};

export function PolicyStatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.new}`}
    >
      {t(`policies.status.${status}`)}
    </span>
  );
}
