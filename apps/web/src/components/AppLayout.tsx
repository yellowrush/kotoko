import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { to: '/home', key: 'home' },
  { to: '/places', key: 'places' },
  { to: '/knowledge', key: 'knowledge' },
  { to: '/policies', key: 'policies' },
] as const;

export function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-bold text-brand-700">{t('appName')}</span>
        </div>
      </header>

      <main className="flex-1 px-4 pb-20 pt-4">
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