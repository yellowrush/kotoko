import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChildProfile, KnowledgeContent } from '@kodoko/domain';
import { initI18n } from '../app/i18n';
import { KnowledgePage } from '../routes/KnowledgePage';

const mockState = vi.hoisted(() => ({
  children: [{
    id: 'c1',
    displayName: 'Aki',
    birthDate: '2025-08-08',
    interests: [],
    accessibilityNeeds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
  }] as ChildProfile[],
  knowledge: [
    {
      id: 'current',
      title: 'Current Article',
      summary: 'Current Article',
      body: 'Current Article',
      minAgeMonths: 10,
      maxAgeMonths: 14,
      categories: ['health'],
      locale: 'ja',
      sourceReferences: [],
      status: 'published',
    },
    {
      id: 'upcoming',
      title: 'Upcoming Article',
      summary: 'Upcoming Article',
      body: 'Upcoming Article',
      minAgeMonths: 15,
      maxAgeMonths: 18,
      categories: ['health'],
      locale: 'ja',
      sourceReferences: [],
      status: 'published',
    },
    {
      id: 'later',
      title: 'Later Article',
      summary: 'Later Article',
      body: 'Later Article',
      minAgeMonths: 30,
      maxAgeMonths: 36,
      categories: ['health'],
      locale: 'ja',
      sourceReferences: [],
      status: 'published',
    },
  ] as KnowledgeContent[],
}));

vi.mock('../hooks/useChildren', () => ({
  useChildren: () => ({ children: mockState.children, loading: false }),
}));

vi.mock('../hooks/useKnowledge', () => ({
  useKnowledge: () => ({
    data: mockState.knowledge,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useKnowledgeProgress: () => ({ readIds: new Set(), loading: false }),
}));

describe('KnowledgePage views', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T00:00:00.000Z'));
    await initI18n();
    mockState.children = [mockState.children[0]!];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('separates current, upcoming, and all knowledge', () => {
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Current Article').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Upcoming Article')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: '近いうち' }));
    expect(screen.queryAllByText('Current Article')).toHaveLength(0);
    expect(screen.getAllByText('Upcoming Article').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    expect(screen.getAllByText('Current Article').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Upcoming Article').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Later Article').length).toBeGreaterThan(0);
  });

  it('uses all registered children for the matching view', () => {
    mockState.children = [
      {
        ...mockState.children[0]!,
        id: 'c1',
        birthDate: '2025-08-08',
      },
      {
        ...mockState.children[0]!,
        id: 'c2',
        birthDate: '2024-02-08',
      },
    ];

    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Current Article').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Later Article').length).toBeGreaterThan(0);
  });
});
