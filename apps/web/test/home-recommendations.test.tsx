import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChildProfile, KnowledgeContent, Place, Policy, UserPreference } from '@kodoko/domain';
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

const otherChild: ChildProfile = {
  ...child,
  id: 'c2',
  displayName: 'Haru',
  birthDate: '2025-08-01',
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
  toggleChild: vi.fn(),
  knowledge: [] as KnowledgeContent[],
  policies: [] as Policy[],
  policyStatusById: {} as Record<string, 'new' | 'viewed' | 'planned' | 'completed' | 'dismissed'>,
  policyTasksLoading: false,
}));

vi.mock('../src/hooks/useSelectedChildren', () => ({
  useSelectedChildren: () => ({
    children: homeMocks.children,
    selected: homeMocks.selected,
    selectedIds: homeMocks.selected.map((item) => item.id),
    toggle: homeMocks.toggleChild,
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
  useKnowledge: () => ({ data: homeMocks.knowledge, isLoading: false }),
  useKnowledgeProgress: () => ({ readIds: new Set(), loading: false }),
}));

vi.mock('../src/hooks/usePolicies', () => ({
  usePolicies: () => ({ data: homeMocks.policies, isLoading: false }),
  usePolicyTasks: () => ({ statusFor: () => 'new' }),
  usePolicyTasksForChildren: () => ({
    loading: homeMocks.policyTasksLoading,
    statusFor: (policyId: string, childId?: string) =>
      homeMocks.policyStatusById[`${childId ?? 'none'}:${policyId}`] ??
      homeMocks.policyStatusById[policyId] ??
      'new',
  }),
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
    homeMocks.toggleChild.mockClear();
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
    homeMocks.knowledge = [];
    homeMocks.policies = [];
    homeMocks.policyStatusById = {};
    homeMocks.policyTasksLoading = false;
  });

  it('uses municipality fallback when GPS is unavailable', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fallback Park')).toBeInTheDocument();
    expect(screen.getByText(/居住地:/)).toBeInTheDocument();
    expect(screen.getByText('今日の天気')).toBeInTheDocument();
  });

  it('uses dropdown controls for transport and group size', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const transport = screen.getByRole('combobox', { name: /交通手段:/ });
    const group = screen.getByRole('combobox', { name: /子どもの人数:/ });

    expect(screen.getByText('🧭')).toBeInTheDocument();
    fireEvent.change(transport, { target: { value: 'walking' } });
    fireEvent.change(group, { target: { value: '2' } });

    expect(transport).toHaveValue('walking');
    expect(group).toHaveValue('2');
    expect(screen.getByText('🚶')).toBeInTheDocument();
    expect(screen.getByText('👪')).toBeInTheDocument();
  });

  it('highlights top recommendations with medal ranking and score badge', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('Fallback Park')).not.toHaveClass('truncate');
    expect(screen.getByText('スコア')).toBeInTheDocument();
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

    expect(screen.getAllByText('子どもを追加').length).toBeGreaterThan(0);
  });

  it('asks the user to select a child when all existing children are deselected', () => {
    homeMocks.selected = [];

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('今日一緒に行く子どもを選んでください。')).toBeInTheDocument();
    expect(screen.queryByText('Fallback Park')).not.toBeInTheDocument();
  });

  it('keeps child cards selectable with pressed state', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: 'Akiを選択' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(homeMocks.toggleChild).toHaveBeenCalledWith('c1');
  });

  it('renders viewed policy reminders with a white background', () => {
    homeMocks.policies = [policy({ id: 'policy-viewed', title: 'Viewed Policy' })];
    homeMocks.policyStatusById = { 'policy-viewed': 'viewed' };

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const reminderLink = screen.getByText('Viewed Policy').closest('a');
    expect(reminderLink).toHaveClass('bg-white');
    expect(reminderLink).not.toHaveClass('bg-brand-50/70');
  });

  it('uses registered children policy status when deciding whether a selected reminder is read', () => {
    homeMocks.children = [child, otherChild];
    homeMocks.selected = [otherChild];
    homeMocks.policies = [policy({ id: 'p-routine-vaccination-3-year-je', title: '3歳からの日本脳炎ワクチンを確認' })];
    homeMocks.policyStatusById = {
      'c1:p-routine-vaccination-3-year-je': 'completed',
      'c2:p-routine-vaccination-3-year-je': 'new',
    };

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const reminderLink = screen.getByText('3歳からの日本脳炎ワクチンを確認').closest('a');
    expect(reminderLink).toHaveClass('bg-white');
    expect(reminderLink).not.toHaveClass('bg-brand-50/70');
  });

  it('shows knowledge and policy reminders for registered children, not only selected children', () => {
    homeMocks.children = [child, otherChild];
    homeMocks.selected = [otherChild];
    homeMocks.knowledge = [
      knowledgeContent({
        id: 'knowledge-for-older-child',
        title: 'Older child knowledge',
        minAgeMonths: 36,
        maxAgeMonths: 48,
      }),
    ];
    homeMocks.policies = [
      policy({
        id: 'policy-for-older-child',
        title: 'Older child policy',
        eligibilityRule: {
          all: [
            { field: 'child.ageMonths', operator: 'gte', value: 36 },
            { field: 'child.ageMonths', operator: 'lte', value: 48 },
          ],
        },
      }),
    ];
    homeMocks.policyStatusById = { 'c1:policy-for-older-child': 'new' };

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Older child knowledge')).toBeInTheDocument();
    expect(screen.getByText('Older child policy')).toBeInTheDocument();
  });
});

function knowledgeContent(overrides: Partial<KnowledgeContent> = {}): KnowledgeContent {
  return {
    id: 'knowledge-item',
    title: 'Knowledge Item',
    summary: 'Knowledge summary',
    body: 'Knowledge body',
    minAgeMonths: 0,
    maxAgeMonths: 216,
    categories: ['parenting'],
    locale: 'ja',
    sourceReferences: [],
    status: 'published',
    ...overrides,
  };
}

function policy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'policy-new',
    title: 'Policy Reminder',
    contextHint: 'Policy reminder context',
    authorityLevel: 'municipality',
    municipalityCode: '13106',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 0 },
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
      ],
    },
    officialUrl: 'https://example.com/policy',
    sourceCheckedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    status: 'published',
    ...overrides,
  };
}
