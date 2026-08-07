import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@kodoko/ui';
import { calculateAgeMonths } from '@kodoko/domain';
import { useActiveChild } from '../hooks/useActiveChild';
import { AgeLabel } from '../components/AgeLabel';
import { ChildAvatar } from '../components/ChildAvatar';
import { PageHeader } from '../components/PageHeader';

export function ChildrenPage() {
  const { t } = useTranslation();
  const { children, active, setActive, loading } = useActiveChild();

  return (
    <div>
      <PageHeader
        title={t('children.title')}
        backTo="/home"
        action={
          <Link to="/children/new">
            <Button variant="secondary">{t('children.new')}</Button>
          </Link>
        }
      />
      {loading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}
      {!loading && children.length === 0 && (
        <p className="text-sm text-gray-500">{t('children.noChildren')}</p>
      )}
      <ul className="flex flex-col gap-2">
        {children.map((child) => (
          <li key={child.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActive(child.id)}
                    aria-pressed={active?.id === child.id}
                    className={`h-5 w-5 rounded-full border ${
                      active?.id === child.id
                        ? 'border-brand-600 bg-brand-600'
                        : 'border-gray-300'
                    }`}
                    aria-label={t('children.selectChild', { name: child.displayName })}
                  />
                  <ChildAvatar gender={child.gender} ageMonths={calculateAgeMonths(child.birthDate)} size="sm" />
                  <div>
                    <span className="font-medium">{child.displayName}</span>
                    <p className="text-xs text-gray-500">
                      <AgeLabel birthDate={child.birthDate} />
                    </p>
                  </div>
                </div>
              <Link to={`/children/${child.id}/edit`} className="text-sm text-brand-700">
                {t('edit')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
