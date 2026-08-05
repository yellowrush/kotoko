import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PageHeader';

export function KnowledgeDetailPage() {
  const { t } = useTranslation();
  const { knowledgeId } = useParams();
  return (
    <PagePlaceholder title={t('knowledge.title')} description="Sprint 5">
      <span className="text-xs text-gray-400">{knowledgeId}</span>
    </PagePlaceholder>
  );
}