import { useAppTranslation } from '../hooks/useAppTranslation';
import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/PageHeader';

export function ProfilePage() {
  const { t } = useAppTranslation();
  return (
    <div>
      <PagePlaceholder title={t('nav.profile')} description="Sprint 7">
        <Link
          to="/login"
          className="kodoko-button kodoko-button-secondary inline-flex px-4 py-2 text-sm font-semibold"
        >
          {t('login.title')}
        </Link>
      </PagePlaceholder>
    </div>
  );
}
