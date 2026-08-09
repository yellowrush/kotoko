import { useAppTranslation } from '../hooks/useAppTranslation';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useAppTranslation();
  return (
    <div className="kodoko-card flex flex-col items-center gap-3 px-5 py-12 text-center">
      <h1 className="text-xl font-bold text-gray-900">404</h1>
      <Link
        to="/home"
        className="kodoko-button kodoko-button-secondary inline-flex px-4 py-2 text-sm font-semibold"
      >
        {t('nav.home')}
      </Link>
    </div>
  );
}
