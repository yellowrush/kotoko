import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { LANGUAGE_OPTIONS, useLocale } from '../hooks/useLocale';

const NAV_ITEMS = [
  { to: '/home', key: 'profile' },
  { to: '/places', key: 'places' },
  { to: '/favorites', key: 'favorites' },
] as const;

const FULL_BLEED_ROUTES = new Set(['/places']);

function LanguageSelect() {
  const { t } = useAppTranslation();
  const { locale, setLocale } = useLocale();
  const current = LANGUAGE_OPTIONS.find((option) => option.value === locale) ?? {
    value: 'ja',
    label: '日本語',
  };

  return (
    <details className="group relative">
      <summary
        aria-label={t('settings.language')}
        className="flex h-9 cursor-pointer list-none items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700 shadow-sm marker:hidden"
      >
        <span>{current.label}</span>
      </summary>
      <div className="absolute right-0 top-10 z-20 min-w-32 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(event) => {
              setLocale(option.value);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}
            className={`block w-full px-3 py-2 text-left text-sm ${
              option.value === locale ? 'bg-brand-50 text-brand-800' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function AppLayout() {
  const { t } = useAppTranslation();
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED_ROUTES.has(pathname);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/home" aria-label="こどこ">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="こどこ" className="h-8 w-auto" />
            </Link>
          </div>
          <LanguageSelect />
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

