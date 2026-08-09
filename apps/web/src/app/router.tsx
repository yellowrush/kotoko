import { lazy, Suspense, type ReactNode } from 'react';
import i18next from 'i18next';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';

const HomePage = lazy(() => import('../routes/HomePage').then((mod) => ({ default: mod.HomePage })));
const OnboardingPage = lazy(() =>
  import('../routes/OnboardingPage').then((mod) => ({ default: mod.OnboardingPage })),
);
const PlacesMapPage = lazy(() =>
  import('../routes/PlacesMapPage').then((mod) => ({ default: mod.PlacesMapPage })),
);
const PlaceDetailPage = lazy(() =>
  import('../routes/PlaceDetailPage').then((mod) => ({ default: mod.PlaceDetailPage })),
);
const ChildNewPage = lazy(() =>
  import('../routes/ChildNewPage').then((mod) => ({ default: mod.ChildNewPage })),
);
const ChildEditPage = lazy(() =>
  import('../routes/ChildEditPage').then((mod) => ({ default: mod.ChildEditPage })),
);
const KnowledgePage = lazy(() =>
  import('../routes/KnowledgePage').then((mod) => ({ default: mod.KnowledgePage })),
);
const KnowledgeDetailPage = lazy(() =>
  import('../routes/KnowledgeDetailPage').then((mod) => ({ default: mod.KnowledgeDetailPage })),
);
const PoliciesPage = lazy(() =>
  import('../routes/PoliciesPage').then((mod) => ({ default: mod.PoliciesPage })),
);
const PolicyDetailPage = lazy(() =>
  import('../routes/PolicyDetailPage').then((mod) => ({ default: mod.PolicyDetailPage })),
);
const LoginPage = lazy(() => import('../routes/LoginPage').then((mod) => ({ default: mod.LoginPage })));
const ProfilePage = lazy(() => import('../routes/ProfilePage').then((mod) => ({ default: mod.ProfilePage })));
const FavoritesPage = lazy(() =>
  import('../routes/FavoritesPage').then((mod) => ({ default: mod.FavoritesPage })),
);
const PlaceVisitsPage = lazy(() =>
  import('../routes/PlaceVisitsPage').then((mod) => ({ default: mod.PlaceVisitsPage })),
);
const SettingsPage = lazy(() => import('../routes/SettingsPage').then((mod) => ({ default: mod.SettingsPage })));
const NotFoundPage = lazy(() => import('../routes/NotFoundPage').then((mod) => ({ default: mod.NotFoundPage })));

function routeElement(page: ReactNode) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">{i18next.t('common.loading')}</div>}>
      {page}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/home" replace /> },
        { path: 'onboarding', element: routeElement(<OnboardingPage />) },
        { path: 'home', element: routeElement(<HomePage />) },
        { path: 'places', element: routeElement(<PlacesMapPage />) },
        { path: 'places/map', element: <Navigate to="/places" replace /> },
        { path: 'places/:placeId', element: routeElement(<PlaceDetailPage />) },
        { path: 'favorites', element: routeElement(<FavoritesPage />) },
        { path: 'visits', element: routeElement(<PlaceVisitsPage />) },
        { path: 'children/new', element: routeElement(<ChildNewPage />) },
        { path: 'children/:childId/edit', element: routeElement(<ChildEditPage />) },
        { path: 'knowledge', element: routeElement(<KnowledgePage />) },
        { path: 'knowledge/:knowledgeId', element: routeElement(<KnowledgeDetailPage />) },
        { path: 'policies', element: routeElement(<PoliciesPage />) },
        { path: 'policies/:policyId', element: routeElement(<PolicyDetailPage />) },
        { path: 'login', element: routeElement(<LoginPage />) },
        { path: 'profile', element: routeElement(<ProfilePage />) },
        { path: 'settings', element: routeElement(<SettingsPage />) },
        { path: '*', element: routeElement(<NotFoundPage />) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);
