import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { HomePage } from '../routes/HomePage';
import { OnboardingPage } from '../routes/OnboardingPage';
import { PlacesMapPage } from '../routes/PlacesMapPage';
import { PlaceDetailPage } from '../routes/PlaceDetailPage';
import { ChildNewPage } from '../routes/ChildNewPage';
import { ChildEditPage } from '../routes/ChildEditPage';
import { KnowledgePage } from '../routes/KnowledgePage';
import { KnowledgeDetailPage } from '../routes/KnowledgeDetailPage';
import { PoliciesPage } from '../routes/PoliciesPage';
import { PolicyDetailPage } from '../routes/PolicyDetailPage';
import { LoginPage } from '../routes/LoginPage';
import { ProfilePage } from '../routes/ProfilePage';
import { FavoritesPage } from '../routes/FavoritesPage';
import { SettingsPage } from '../routes/SettingsPage';
import { NotFoundPage } from '../routes/NotFoundPage';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/home" replace /> },
        { path: 'onboarding', element: <OnboardingPage /> },
        { path: 'home', element: <HomePage /> },
        { path: 'places', element: <PlacesMapPage /> },
        { path: 'places/map', element: <Navigate to="/places" replace /> },
        { path: 'places/:placeId', element: <PlaceDetailPage /> },
        { path: 'favorites', element: <FavoritesPage /> },
        { path: 'children/new', element: <ChildNewPage /> },
        { path: 'children/:childId/edit', element: <ChildEditPage /> },
        { path: 'knowledge', element: <KnowledgePage /> },
        { path: 'knowledge/:knowledgeId', element: <KnowledgeDetailPage /> },
        { path: 'policies', element: <PoliciesPage /> },
        { path: 'policies/:policyId', element: <PolicyDetailPage /> },
        { path: 'login', element: <LoginPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  // GitHub Pages 專案站台部署時（base != '/'），路由需掛在子路徑下。
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);