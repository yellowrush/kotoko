import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PageHeader';

export function PlaceDetailPage() {
  const { t } = useTranslation();
  const { placeId } = useParams();
  return (
    <PagePlaceholder title={t('places.title')} description={placeId ?? ''}>
      <span className="text-xs text-gray-400">{placeId}</span>
    </PagePlaceholder>
  );
}