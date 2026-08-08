import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChildProfile, Place, UserPreference } from '@kodoko/domain';
import { initI18n } from '../src/app/i18n';
import { HomePage } from '../src/routes/HomePage';

const child: ChildProfile = {
  id: 'c1',
  displayName: 'Aki',
  birthDate: '2023-01-15',
  interests: [],
  accessibilityNeeds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 1,
};

const place = (overrides: Partial<Place>): Place => ({
  id: 'p1',
  name: 'Fallback Park',
  category: 'park',
  latitude: 35.712,
  longitude: 139.779,
  address: 'Tokyo',
  municipalityCode: '13106',
  indoorOutdoor: 'outdoor',
  status: 'published',
  media: [],
  labels: [],
  provenance: [],
  version: 1,
  ...overrides,
});

const homeMocks = vi.hoisted(() => ({
  placesState: {
    data: [] as Place[],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  preference: {
    id: 'default',
    locale: 'ja',
    municipalityCode: '13106',
    radiusKm: 3,
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as UserPreference,
  coords: null as { latitude: number; longitude: number } | null,
  children: [] as ChildProfile[],
  selected: [] as ChildProfile[],
}));

vi.mock('../src/hooks/useSelectedChildren', () => ({
  useSelectedChildren: () => ({
    children: homeMocks.children,
    selected: homeMocks.selected,
    selectedIds: homeMocks.selected.map((item) => item.id),
    toggle: vi.fn(),
    setSelectedIds: vi.fn(),
    loading: false,
  }),
}));

vi.mock('../src/hooks/usePlaces', () => ({
  usePlaces: () => homeMocks.placesState,
}));

vi.mock('../src/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ coords: homeMocks.coords }),
}));

vi.mock('../src/hooks/useWeather', () => ({
  useWeather: () => ({ data: undefined, isPending: false, isError: true }),
}));

vi.mock('../src/hooks/useKnowledge', () => ({
  useKnowledge: () => ({ data: [], isLoading: false }),
  useKnowledgeProgress: () => ({ readIds: new Set(), loading: false }),
}));

vi.mock('../src/hooks/usePolicies', () => ({
  usePolicies: () => ({ data: [], isLoading: false }),
  usePolicyTasks: () => ({ statusFor: () => 'new' }),
}));

vi.mock('../src/hooks/usePreference', () => ({
  usePreference: () => ({ preference: homeMocks.preference }),
}));

beforeAll(async () => {
  await initI18n();
});

afterEach(() => {
  cleanup();
});

describe('HomePage recommendations', () => {
  beforeEach(() => {
    homeMocks.coords = null;
    homeMocks.children = [child];
    homeMocks.selected = [child];
    homeMocks.preference = {
      id: 'default',
      locale: 'ja',
      municipalityCode: '13106',
      radiusKm: 3,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    homeMocks.placesState = {
      data: [place({})],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it('uses municipality fallback when GPS is unavailable', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fallback Park')).toBeInTheDocument();
    expect(screen.getByText(/距離/)).toBeInTheDocument();
  });

  it('keeps cached recommendations visible when places refetch fails', async () => {
    homeMocks.placesState = {
      data: [place({ id: 'cached', name: 'Cached Park' })],
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cached Park')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    await waitFor(() => expect(homeMocks.placesState.refetch).toHaveBeenCalled());
  });

  it('shows add child only when there are no children', () => {
    homeMocks.children = [];
    homeMocks.selected = [];

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('こどもを追加').length).toBeGreaterThan(0);
  });

  it('asks the user to select a child when all existing children are deselected', () => {
    homeMocks.selected = [];

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('今日一緒に行くこどもを選択してください。')).toBeInTheDocument();
    expect(screen.queryByText('Fallback Park')).not.toBeInTheDocument();
  });
});
