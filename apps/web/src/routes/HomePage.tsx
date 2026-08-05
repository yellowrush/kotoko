import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@kodoko/ui';
import { useActiveChild } from '../hooks/useActiveChild';
import { AgeLabel } from '../components/AgeLabel';
import { PageHeader } from '../components/PageHeader';

export function HomePage() {
  const { t } = useTranslation();
  const { children, active, setActive, loading } = useActiveChild();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('home.title')} />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">{t('home.currentChild')}</h2>
          {!loading && children.length > 1 && (
            <label className="flex items-center gap-1 text-xs text-gray-500">
              {t('home.switchChild')}
              <select
                value={active?.id ?? ''}
                onChange={(e) => setActive(e.target.value)}
                className="rounded border border-gray-300 px-1 py-0.5 text-xs"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {loading ? (
          <p className="mt-2 text-sm text-gray-400">{t('loading')}</p>
        ) : active ? (
          <div className="mt-2">
            <p className="text-base font-medium">{active.displayName}</p>
            <p className="text-sm text-gray-500">
              <AgeLabel birthDate={active.birthDate} />
            </p>
          </div>
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
