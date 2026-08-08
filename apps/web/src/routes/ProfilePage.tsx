import { useAppTranslation } from '../hooks/useAppTranslation';
import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/PageHeader';

export function ProfilePage() {
  const { t } = useAppTranslation();
  return (
    <div>
      <PagePlaceholder title={t('nav.profile')} description="Sprint 7">
        <Link to="/login" className="text-sm text-brand-700">
          {t('login.title')}
        </Link>
      </PagePlaceholder>
    </div>
  );
}
