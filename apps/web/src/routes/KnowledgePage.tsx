import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { calculateAgeMonths } from '@kodoko/domain';
import { useActiveChild } from '../hooks/useActiveChild';
import { useKnowledge, useKnowledgeProgress } from '../hooks/useKnowledge';
import {
  filterKnowledgeByAge,
  filterUpcomingKnowledgeByAge,
  sortKnowledgeByRead,
} from '../lib/knowledge';
import { PageHeader } from '../components/PageHeader';

type KnowledgeView = 'forChild' | 'upcoming' | 'all';

export function KnowledgePage() {
  const { t } = useAppTranslation();
  const { data: knowledge, isLoading, isError, refetch } = useKnowledge();
  const { active } = useActiveChild();
  const { readIds } = useKnowledgeProgress();
  const [view, setView] = useState<KnowledgeView>('forChild');
  const ageMonths = active ? calculateAgeMonths(active.birthDate) : undefined;

  const visible = useMemo(() => {
    const list = knowledge ?? [];
    if (!active || view === 'all') return sortKnowledgeByRead(list, readIds);
    if (view === 'upcoming') {
      return sortKnowledgeByRead(filterUpcomingKnowledgeByAge(list, ageMonths), readIds);
    }
    return sortKnowledgeByRead(filterKnowledgeByAge(list, ageMonths), readIds);
  }, [knowledge, active, view, ageMonths, readIds]);

  return (
    <div>
      <PageHeader title={t('knowledge.title')} backTo="/home" />

      {isLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <p>{t('common.error')}</p>
          <button type="button" onClick={() => void refetch()} className="text-brand-700">
            {t('common.retry')}
          </button>
        </div>
      )}

      {!isError && !active && (
        <p className="mb-3 text-xs text-gray-400">{t('knowledge.noChild')}</p>
      )}

      {!isError && !isLoading && (
        <div className="mb-3 flex rounded-lg bg-gray-100 p-1 text-xs">
          {(['forChild', 'upcoming', 'all'] as const).map((option) => {
            const activeOption = !active && option !== 'all' ? false : view === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                disabled={!active && option !== 'all'}
                className={`flex-1 rounded-md px-2 py-1 font-medium ${
                  activeOption ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'
                } disabled:text-gray-300`}
              >
                {t(`knowledge.views.${option}`)}
              </button>
            );
          })}
        </div>
      )}

      {!isError && !isLoading && visible.length === 0 && (
        <p className="text-sm text-gray-500">{t('knowledge.noContent')}</p>
      )}

      {!isError && (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                to={`/knowledge/${item.id}`}
                className="block rounded-lg border border-gray-100 bg-white p-3 hover:bg-gray-50"
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  {readIds.has(item.id) ? (
                    <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                      {t('knowledge.read')}
                    </span>
                  ) : (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-brand-600"
                      aria-label={t('knowledge.unread')}
                    />
                  )}
                  <span className="min-w-0 truncate">{item.title}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.summary}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {t('knowledge.ageRange')}: {item.minAgeMonths}~{item.maxAgeMonths}{' '}
                  {t('places.monthsUnit')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
