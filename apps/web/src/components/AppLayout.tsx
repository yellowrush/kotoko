import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { PwaInstallButton } from './PwaInstallButton';

const NAV_ITEMS = [
  { to: '/home', key: 'profile' },
  { to: '/places', key: 'places' },
  { to: '/favorites', key: 'favorites' },
] as const;

const FULL_BLEED_ROUTES = new Set(['/places']);

export function AppLayout() {
  const { t } = useAppTranslation();
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED_ROUTES.has(pathname);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col text-[15px] text-gray-900 sm:text-base">
      <header className="sticky top-0 z-10 px-3 pt-3">
        <div className="kodoko-panel bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                to="/home"
                aria-label={t('common.appName')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100"
              >
                <img
                  src={`${import.meta.env.BASE_URL}favicon.svg`}
                  alt={t('common.appName')}
                  className="h-8 w-auto"
                />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight text-gray-900">
                  {t('common.appName')}
                </p>
                <p className="truncate text-xs font-medium leading-tight text-gray-500">
                  {t('common.logoSubtitle')}
                </p>
              </div>
            </div>
            <PwaInstallButton />
          </div>
        </div>
      </header>

      <main
        className={
          fullBleed
            ? 'flex flex-1 flex-col overflow-hidden'
            : 'flex-1 px-4 pb-28 pt-4'
        }
      >
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-3 bottom-3 z-10 mx-auto max-w-lg">
        <div className="mx-auto flex rounded-full border border-brand-100 bg-white/95 p-1.5 shadow-[0_8px_0_rgba(249,95,20,0.08),0_18px_34px_rgba(120,53,15,0.18)] backdrop-blur">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-sm font-bold transition sm:text-base ${
                  isActive
                    ? 'bg-brand-100 text-brand-800 shadow-inner'
                    : 'text-gray-500 hover:bg-brand-50'
                }`
              }
            >
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
