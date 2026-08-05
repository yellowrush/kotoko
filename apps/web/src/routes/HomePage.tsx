import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import { useChildren } from '../hooks/useChildren';
import { PageHeader } from '../components/PageHeader';

export function HomePage() {
  const { t } = useTranslation();
  const { children, loading } = useChildren();

  const current = children[0];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('home.title')} />

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.currentChild')}</h2>
        {loading ? (
          <p className="mt-2 text-sm text-gray-400">{t('loading')}</p>
        ) : current ? (
          <p className="mt-2 text-base font-medium">{current.displayName}</p>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">{t('home.noChildYet')}</p>
            <Link to="/children/new" className="text-sm font-medium text-brand-700">
              {t('home.addChild')}
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.weeklyKnowledge')}</h2>
        <p className="mt-2 text-sm text-gray-400">Sprint 5</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.policyReminders')}</h2>
        <p className="mt-2 text-sm text-gray-400">Sprint 6</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500">{t('home.localDataStatus')}</h2>
        <p className="mt-2 text-sm text-gray-400">{children.length} children</p>
      </Card>
    </div>
  );
}