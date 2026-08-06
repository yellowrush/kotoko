import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { to: '/home', key: 'home' },
  { to: '/places', key: 'places' },
  { to: '/favorites', key: 'favorites' },
  { to: '/knowledge', key: 'knowledge' },
  { to: '/policies', key: 'policies' },
] as const;

const FULL_BLEED_ROUTES = new Set(['/places']);

export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED_ROUTES.has(pathname);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8" className="fill-brand-600" />
            <path
              d="M4.5 20c1.3-4.2 4.2-6.2 7.5-6.2s6.2 2 7.5 6.2"
              className="fill-brand-600"
            />
          </svg>
          <span className="text-sm font-bold text-brand-700">{t('appName')}</span>
        </div>
        </div>
      </header>

      <main className={fullBleed ? 'flex flex-1 flex-col overflow-hidden' : 'flex-1 px-4 pb-20 pt-4'}>
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium ${
                  isActive ? 'text-brand-700' : 'text-gray-500'
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