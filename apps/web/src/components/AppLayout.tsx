import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { PwaInstallButton } from './PwaInstallButton';

const NAV_ITEMS = [
  { to: '/home', key: 'profile' },
  { to: '/places', key: 'places' },
  { to: '/favorites', key: 'favorites' },
] as const;

const FULL_BLEED_ROUTES = new Set(['/places']);

function PlacesLineIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      className="kodoko-bottom-nav-flag h-9 w-9 fill-none stroke-current"
    >
      <path
        d="M19 36V11"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M20 12c4-3 8 2 13-1v14c-5 3-9-2-13 1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M12 38c5-3 19-3 24 0"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <circle cx="19" cy="10.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

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
            : 'flex-1 px-4 pb-36 pt-4'
        }
      >
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-3 bottom-6 z-10 mx-auto max-w-lg">
        <div className="relative mx-auto h-24">
          <div className="absolute inset-x-0 bottom-0 grid h-[4.6rem] grid-cols-[1fr_6rem_1fr] items-center rounded-[2rem] border-2 border-brand-200 bg-white/95 px-2 py-2 shadow-[0_7px_0_rgba(249,95,20,0.13),0_20px_34px_rgba(120,53,15,0.2)] backdrop-blur">
            {NAV_ITEMS.map((item) => {
              const isPrimary = item.key === 'places';
              if (isPrimary) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `kodoko-bottom-nav-primary absolute left-1/2 top-1/2 z-10 flex h-[5.4rem] w-[5.4rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border-[3px] px-2 text-center font-extrabold transition sm:h-24 sm:w-24 ${
                        isActive
                          ? 'is-active border-brand-800 bg-brand-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_0_rgba(119,39,4,0.38),0_20px_30px_rgba(120,53,15,0.3)]'
                          : 'border-brand-300 bg-brand-50 text-brand-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_0_rgba(249,95,20,0.22),0_18px_28px_rgba(120,53,15,0.22)] hover:bg-brand-100'
                      }`
                    }
                  >
                    <PlacesLineIcon />
                    <span className="text-[11px] leading-none sm:text-xs">
                      {t(`nav.${item.key}`)}
                    </span>
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `kodoko-bottom-nav-side flex h-12 self-center rounded-full px-2 py-2 text-sm font-bold transition sm:text-base ${
                      item.key === 'profile' ? 'col-start-1' : 'col-start-3'
                    } ${
                      isActive
                        ? 'is-active items-center justify-center bg-brand-100 text-brand-800 shadow-inner'
                        : 'items-center justify-center text-gray-500 hover:bg-brand-50'
                    }`
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
