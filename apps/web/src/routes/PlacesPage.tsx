import { useTranslation } from 'react-i18next';
import { PageHeader, PagePlaceholder } from '../components/PageHeader';

export function PlacesPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('places.title')} />
      <PagePlaceholder title={t('places.title')} description="Sprint 3 / 4" />
    </div>
  );
}