import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/PageHeader';

export function ProfilePage() {
  const { t } = useTranslation();
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