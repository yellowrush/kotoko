import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useKnowledgeDetail, useKnowledgeProgress } from '../hooks/useKnowledge';
import { PageHeader } from '../components/PageHeader';

export function KnowledgeDetailPage() {
  const { t } = useTranslation();
  const { knowledgeId } = useParams();
  const { data: item, isLoading, isError, refetch } = useKnowledgeDetail(knowledgeId);
  const { markRead } = useKnowledgeProgress();

  const itemId = item?.id;
  useEffect(() => {
    if (itemId) void markRead(itemId);
  }, [itemId, markRead]);

  if (isLoading) {
    return <p className="text-gray-400">{t('common.loading')}</p>;
  }

  if (isError || !item) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-500">
        <p>{t('common.error')}</p>
        <button type="button" onClick={() => void refetch()} className="text-brand-700">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={item.title} backTo="/knowledge" />

      {item.categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.categories.map((category) => (
            <span key={category} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {t(`knowledge.categories.${category}`)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-gray-600">{item.summary}</p>

      <div className="mt-4 flex flex-col gap-3">
        {item.body.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-gray-700">
            {paragraph}
          </p>
        ))}
      </div>

      {item.sourceReferences.length > 0 && (
        <div className="mt-6 rounded-xl bg-gray-50 p-3">
          <h2 className="text-sm font-semibold text-gray-600">{t('knowledge.sources')}</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {item.sourceReferences.map((source, index) => (
              <li key={index} className="text-sm">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {source.title} ↗
                  </a>
                ) : (
                  <span className="text-gray-600">{source.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}