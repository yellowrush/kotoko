import { useTranslation } from 'react-i18next';
import { PageHeader, PagePlaceholder } from '../components/PageHeader';

export function PoliciesPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('policies.title')} />
      <PagePlaceholder title={t('policies.title')} description="Sprint 6" />
    </div>
  );
}