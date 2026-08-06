import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Policy } from '@kodoko/domain';
import type { PolicyLeafCheck } from '@kodoko/policy-engine';
import { PolicyDetailPage } from '../routes/PolicyDetailPage';
import { changeLocale, initI18n } from '../app/i18n';const mockPolicies = vi.hoisted(() => ({
  usePolicyDetail: vi.fn(),
  usePolicyMatches: vi.fn(),
  usePolicyTasks: vi.fn(),
}));

vi.mock('../hooks/usePolicies', () => ({
  usePolicyDetail: mockPolicies.usePolicyDetail,
  usePolicyMatches: mockPolicies.usePolicyMatches,
  usePolicyTasks: mockPolicies.usePolicyTasks,
}));

beforeEach(async () => {
  await initI18n();
  await changeLocale('zh-TW');
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

function renderPage() {
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
    renderPage();
    expect(screen.queryByText(/returned an object/i)).toBeNull();
  });

  it('merges age conditions into a single row', async () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(screen.getAllByText(/適合月齡|対象月齢/).length).toBeGreaterThan(0);
  });

  it('keeps the section header as a plain label', async () => {
    renderPage();
    expect(screen.getAllByText(/適用條件|適用条件/).length).toBeGreaterThan(0);
  });
});

function makePolicy(): Policy {
  return {
    id: 'p-weaning-class',
    title: '離乳食ふれあい講座（台東区の例）',
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
  };
}

function makeCheck(): PolicyLeafCheck {
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
  };
}