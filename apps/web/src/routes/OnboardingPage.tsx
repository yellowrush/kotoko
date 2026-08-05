import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@kodoko/ui';
import { PagePlaceholder } from '../components/PageHeader';

export function OnboardingPage() {
  const { t } = useTranslation();
  return (
    <PagePlaceholder title={t('onboarding.title')} description={t('onboarding.description')}>
      <Link to="/children/new">
        <Button>{t('onboarding.start')}</Button>
      </Link>
    </PagePlaceholder>
  );
}