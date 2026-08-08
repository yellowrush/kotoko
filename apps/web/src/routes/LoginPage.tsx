import { useAppTranslation } from '../hooks/useAppTranslation';
import { PagePlaceholder } from '../components/PageHeader';

export function LoginPage() {
  const { t } = useAppTranslation();
  return (
    <PagePlaceholder title={t('login.title')} description={t('login.description')}>
      <span className="text-xs text-gray-400">Sprint 7</span>
    </PagePlaceholder>
  );
}
