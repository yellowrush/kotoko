import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@kodoko/ui';
import { useChildren } from '../hooks/useChildren';
import { PageHeader } from '../components/PageHeader';

export function ChildrenPage() {
  const { t } = useTranslation();
  const { children, loading } = useChildren();

  return (
    <div>
      <PageHeader
        title={t('children.title')}
        action={
          <Link to="/children/new">
            <Button variant="secondary">{t('children.new')}</Button>
          </Link>
        }
      />
      {loading && <p className="text-sm text-gray-400">{t('loading')}</p>}
      {!loading && children.length === 0 && <p className="text-sm text-gray-500">{t('children.noChildren')}</p>}
      <ul className="flex flex-col gap-2">
        {children.map((child) => (
          <li key={child.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{child.displayName}</span>
              <Link to={`/children/${child.id}/edit`} className="text-sm text-brand-700">
                {t('edit')}
              </Link>
            </div>
            <p className="mt-1 text-xs text-gray-500">{child.birthDate}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}