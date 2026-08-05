import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PageHeader';

export function PolicyDetailPage() {
  const { t } = useTranslation();
  const { policyId } = useParams();
  return (
    <PagePlaceholder title={t('policies.title')} description="Sprint 6">
      <span className="text-xs text-gray-400">{policyId}</span>
    </PagePlaceholder>
  );
}