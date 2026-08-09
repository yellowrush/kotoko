import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ChildProfile, Policy } from '@kodoko/domain';
import { PolicyDetailPage } from '../routes/PolicyDetailPage';
import { PoliciesPage } from '../routes/PoliciesPage';
import { changeLocale, initI18n } from '../app/i18n';

const child: ChildProfile = {
  id: 'c1',
  displayName: 'Aki',
  birthDate: '2026-01-10',
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
  birthDate: '2025-08-10',
};

const mockPolicies = vi.hoisted(() => ({
  usePolicies: vi.fn(),
  usePolicyDetail: vi.fn(),
  usePolicyTasksForChildren: vi.fn(),
  children: [] as ChildProfile[],
  preference: { municipalityCode: '13106' },
}));

vi.mock('../hooks/usePolicies', () => ({
  usePolicies: mockPolicies.usePolicies,
  usePolicyDetail: mockPolicies.usePolicyDetail,
  usePolicyTasksForChildren: mockPolicies.usePolicyTasksForChildren,
}));

vi.mock('../hooks/useChildren', () => ({
  useChildren: () => ({ children: mockPolicies.children, loading: false }),
}));

vi.mock('../hooks/usePreference', () => ({
  usePreference: () => ({ preference: mockPolicies.preference }),
}));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-09T00:00:00.000Z'));
  await initI18n();
  await changeLocale('ja');
  mockPolicies.children = [child];
  mockPolicies.preference = { municipalityCode: '13106' };
  mockPolicies.usePolicies.mockReturnValue({
    data: [makePolicy()],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mockPolicies.usePolicyDetail.mockReturnValue({
    data: makePolicy(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mockPolicies.usePolicyTasksForChildren.mockReturnValue({
    tasks: new Map(),
    loading: false,
    setStatus: vi.fn(),
    statusFor: vi.fn(() => 'new'),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDetailPage(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/policies/p-weaning-class', state }]}>
      <Routes>
        <Route path="/policies/:policyId" element={<PolicyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PolicyDetailPage conditions', () => {
  it('does not render the English i18n object fallback warning', async () => {
    renderDetailPage();
    expect(screen.queryByText(/returned an object/i)).toBeNull();
  });

  it('merges age conditions into a single row', async () => {
    const { container } = renderDetailPage();
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('stores planned status for the matched registered child', async () => {
    const setStatus = vi.fn();
    mockPolicies.usePolicyTasksForChildren.mockReturnValue({
      tasks: new Map(),
      loading: false,
      setStatus,
      statusFor: vi.fn(() => 'viewed'),
    });

    renderDetailPage();
    fireEvent.click(screen.getByRole('button', { name: '対応予定にする' }));

    expect(setStatus).toHaveBeenCalledWith('p-weaning-class', 'planned', 'c1');
  });

  it('uses the entry source as the detail back link target', () => {
    const { container } = renderDetailPage({ backTo: '/home' });
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/home');
  });
});

describe('PoliciesPage views', () => {
  it('switches between applicable, not applicable, and all tabs', () => {
    const policies = [
      makePolicy({ id: 'p-new', title: 'New policy' }),
      makePolicy({ id: 'p-planned', title: 'Planned policy' }),
      makePolicy({ id: 'p-viewed', title: 'Viewed policy' }),
      makePolicy({
        id: 'p-out',
        title: 'Out policy',
        eligibilityRule: { all: [{ field: 'child.ageMonths', operator: 'gte', value: 200 }] },
      }),
    ];
    mockPolicies.usePolicies.mockReturnValue({
      data: policies,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockPolicies.usePolicyTasksForChildren.mockReturnValue({
      tasks: new Map(),
      loading: false,
      setStatus: vi.fn(),
      statusFor: vi.fn((policyId: string) =>
        policyId === 'p-planned' ? 'planned' : policyId === 'p-viewed' ? 'viewed' : 'new',
      ),
    });

    render(
      <MemoryRouter>
        <PoliciesPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button').map((tab) => tab.textContent)).toEqual([
      '対象の制度',
      '今は対象外',
      'すべて',
    ]);
    expect(screen.getByText('New policy')).toBeInTheDocument();
    expect(screen.getByText('Planned policy')).toBeInTheDocument();
    expect(screen.getByText('Viewed policy')).toBeInTheDocument();
    expect(screen.queryByText('Out policy')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '今は対象外' }));
    expect(screen.queryByText('New policy')).toBeNull();
    expect(screen.getByText('Out policy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    expect(screen.getByText('New policy')).toBeInTheDocument();
    expect(screen.getByText('Planned policy')).toBeInTheDocument();
    expect(screen.getByText('Viewed policy')).toBeInTheDocument();
    expect(screen.getByText('Out policy')).toBeInTheDocument();
  });

  it('uses all registered children for the applicable policies list', () => {
    mockPolicies.children = [child, otherChild];
    mockPolicies.usePolicies.mockReturnValue({
      data: [
        makePolicy({
          id: 'p-other-child',
          title: 'Other child policy',
          eligibilityRule: {
            all: [
              { field: 'child.ageMonths', operator: 'gte', value: 11 },
              { field: 'child.ageMonths', operator: 'lte', value: 13 },
            ],
          },
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockPolicies.usePolicyTasksForChildren.mockReturnValue({
      tasks: new Map(),
      loading: false,
      setStatus: vi.fn(),
      statusFor: vi.fn((policyId: string, childId?: string) =>
        childId === 'c2' && policyId === 'p-other-child' ? 'new' : 'dismissed',
      ),
    });

    render(
      <MemoryRouter>
        <PoliciesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Other child policy')).toBeInTheDocument();
  });
});

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'p-weaning-class',
    title: 'Weaning class',
    contextHint: 'Policy context',
    authorityLevel: 'municipality',
    municipalityCode: '13106',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 4 },
        { field: 'child.ageMonths', operator: 'lte', value: 12 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13106' },
      ],
    },
    officialUrl: 'https://www.city.taito.lg.jp',
    sourceCheckedAt: '2026-01-10T00:00:00.000Z',
    version: 1,
    status: 'published',
    ...overrides,
  };
}
