import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { calculateAgeMonths } from '@kodoko/domain';
import { useChildren } from '../hooks/useChildren';
import { useKnowledge, useKnowledgeProgress } from '../hooks/useKnowledge';
import {
  filterKnowledgeByAges,
  filterUpcomingKnowledgeByAges,
  sortKnowledgeByRead,
} from '../lib/knowledge';
import { PageHeader } from '../components/PageHeader';

type KnowledgeView = 'forChild' | 'upcoming' | 'all';

export function KnowledgePage() {
  const { t } = useAppTranslation();
  const { data: knowledge, isLoading, isError, refetch } = useKnowledge();
  const { children } = useChildren();
  const { readIds } = useKnowledgeProgress();
  const [view, setView] = useState<KnowledgeView>('forChild');
  const ageMonthsList = useMemo(() => children.map((child) => calculateAgeMonths(child.birthDate)), [children]);
  const hasChildren = children.length > 0;

  const visible = useMemo(() => {
    const list = knowledge ?? [];
    if (!hasChildren || view === 'all') return sortKnowledgeByRead(list, readIds);
    if (view === 'upcoming') {
      return sortKnowledgeByRead(filterUpcomingKnowledgeByAges(list, ageMonthsList), readIds);
    }
    return sortKnowledgeByRead(filterKnowledgeByAges(list, ageMonthsList), readIds);
  }, [knowledge, hasChildren, view, ageMonthsList, readIds]);

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

      {!isError && !hasChildren && <p className="mb-3 text-sm text-gray-500">{t('knowledge.noChild')}</p>}

      {!isError && !isLoading && (
        <div className="mb-4 flex rounded-xl bg-gray-100 p-1 text-sm">
          {(['forChild', 'upcoming', 'all'] as const).map((option) => {
            const activeOption = !hasChildren && option !== 'all' ? false : view === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                disabled={!hasChildren && option !== 'all'}
                className={`touch-target flex-1 rounded-lg px-2 py-1 font-medium ${
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
                state={{ backTo: '/knowledge' }}
                className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/30"
              >
                <span className="mt-0.5 text-xl" aria-hidden="true">
                  📘
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-base font-semibold text-gray-900">
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
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
                  <p className="mt-2 text-sm text-gray-500">
                  {t('knowledge.ageRange')}: {item.minAgeMonths}~{item.maxAgeMonths}{' '}
                  {t('places.monthsUnit')}
                </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
