import { useTranslation } from 'react-i18next';
import { PageHeader, PagePlaceholder } from '../components/PageHeader';

export function PlacesMapPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('places.map')} />
      <PagePlaceholder title={t('places.map')} description="Sprint 3" />
    </div>
  );
}