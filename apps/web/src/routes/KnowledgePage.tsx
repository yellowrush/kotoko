import { useTranslation } from 'react-i18next';
import { PageHeader, PagePlaceholder } from '../components/PageHeader';

export function KnowledgePage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('knowledge.title')} />
      <PagePlaceholder title={t('knowledge.byAge')} description="Sprint 5" />
    </div>
  );
}