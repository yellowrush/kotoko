import { useAppTranslation } from '../hooks/useAppTranslation';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useAppTranslation();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg font-semibold">404</h1>
      <Link to="/home" className="text-sm text-brand-700">
        {t('nav.home')}
      </Link>
    </div>
  );
}
