import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Policy } from '@kodoko/domain';
import type { PolicyLeafCheck } from '@kodoko/policy-engine';
import { PolicyDetailPage } from '../routes/PolicyDetailPage';
import { PoliciesPage } from '../routes/PoliciesPage';
import { changeLocale, initI18n } from '../app/i18n';

const mockPolicies = vi.hoisted(() => ({
  usePolicies: vi.fn(),
  usePolicyDetail: vi.fn(),
  usePolicyMatches: vi.fn(),
  usePolicyTasks: vi.fn(),
  active: { id: 'c1' },
}));

vi.mock('../hooks/usePolicies', () => ({
  usePolicies: mockPolicies.usePolicies,
  usePolicyDetail: mockPolicies.usePolicyDetail,
  usePolicyMatches: mockPolicies.usePolicyMatches,
  usePolicyTasks: mockPolicies.usePolicyTasks,
}));

vi.mock('../hooks/useActiveChild', () => ({
  useActiveChild: () => ({ active: mockPolicies.active }),
}));

beforeEach(async () => {
  await initI18n();
  await changeLocale('zh-TW');
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
  mockPolicies.usePolicyMatches.mockReturnValue(new Map([['p-weaning-class', makeCheck()]]));
  mockPolicies.usePolicyTasks.mockReturnValue({
    tasks: new Map(),
    loading: false,
    setStatus: vi.fn(),
    statusFor: vi.fn(() => 'new'),
  });
});

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/policies/p-weaning-class']}>
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
    expect(screen.getAllByText(/対象月齢 4〜12 ヶ月/).length).toBeGreaterThan(0);
  });

  it('keeps the section header as a plain label', async () => {
    renderDetailPage();
    expect(screen.getAllByText('適用条件').length).toBeGreaterThan(0);
  });
});

describe('PoliciesPage sections', () => {
  it('groups new, planned, applicable, and not applicable policies', () => {
    const policies = [
      makePolicy({ id: 'p-new', title: '新政策' }),
      makePolicy({ id: 'p-planned', title: '計畫政策' }),
      makePolicy({ id: 'p-viewed', title: '已看政策' }),
      makePolicy({ id: 'p-out', title: '不適用政策' }),
    ];
    mockPolicies.usePolicies.mockReturnValue({
      data: policies,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockPolicies.usePolicyMatches.mockReturnValue(
      new Map([
        ['p-new', makeCheck({ matched: true })],
        ['p-planned', makeCheck({ matched: true })],
        ['p-viewed', makeCheck({ matched: true })],
        ['p-out', makeCheck({ matched: false })],
      ]),
    );
    mockPolicies.usePolicyTasks.mockReturnValue({
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

    expect(screen.getAllByText('新しいお知らせ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('予定済み').length).toBeGreaterThan(0);
    expect(screen.getAllByText('対象の制度').length).toBeGreaterThan(0);
    expect(screen.getAllByText('今は対象外').length).toBeGreaterThan(0);
    expect(screen.getByText('新政策')).toBeInTheDocument();
    expect(screen.getByText('計畫政策')).toBeInTheDocument();
    expect(screen.getByText('已看政策')).toBeInTheDocument();
    expect(screen.getByText('不適用政策')).toBeInTheDocument();
  });
});

afterEach(() => {
  cleanup();
});

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'p-weaning-class',
    title: '離乳食講習会',
    contextHint: '離乳食の進め方を学べる講座の例です。',
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

function makeCheck(overrides: Partial<PolicyLeafCheck> = {}): PolicyLeafCheck {
  return {
    matched: false,
    leaves: [
      { field: 'child.ageMonths', operator: 'gte', expected: 4, actual: 7, matched: true },
      { field: 'child.ageMonths', operator: 'lte', expected: 12, actual: 7, matched: true },
      { field: 'user.municipalityCode', operator: 'eq', expected: '13106', actual: '13113', matched: false },
    ],
    failingLeaves: [
      { field: 'user.municipalityCode', operator: 'eq', expected: '13106', actual: '13113', matched: false },
    ],
    ...overrides,
  };
}
