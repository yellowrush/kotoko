import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchContentVersion } from '@kodoko/api-client';
import { PublicContentRefresh } from '../src/app/PublicContentRefresh';
import { invalidatePublicContentQueries } from '../src/app/publicContentQueries';

vi.mock('@kodoko/api-client', () => ({
  fetchContentVersion: vi.fn(),
}));

vi.mock('../src/lib/api', () => ({
  getApiClient: () => ({}),
}));

function contentVersion(signature: string) {
  return {
    places: {
      count: 1,
      latestSourceCheckedAt: '2026-08-08T00:00:00.000Z',
      latestReviewedAt: null,
      maxVersion: 1,
      signature: `places-${signature}`,
    },
    knowledge: {
      count: 1,
      latestSourceCheckedAt: null,
      latestReviewedAt: '2026-08-08T00:00:00.000Z',
      maxVersion: 0,
      signature: `knowledge-${signature}`,
    },
    policies: {
      count: 1,
      latestSourceCheckedAt: '2026-08-08T00:00:00.000Z',
      latestReviewedAt: null,
      maxVersion: 1,
      signature: `policies-${signature}`,
    },
    publishedAt: '2026-08-08T00:00:00.000Z',
    signature,
  };
}

describe('PublicContentRefresh', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invalidates public content queries when content version changes', async () => {
    vi.mocked(fetchContentVersion)
      .mockResolvedValueOnce(contentVersion('v1'))
      .mockResolvedValueOnce(contentVersion('v2'));
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <PublicContentRefresh />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(fetchContentVersion).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['places'] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['place'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['knowledge'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['knowledge-detail'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['policies'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['policy-detail'] });
  });
});

describe('invalidatePublicContentQueries', () => {
  it('targets only public content query keys', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidatePublicContentQueries(queryClient);

    expect(invalidateSpy).toHaveBeenCalledTimes(6);
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['children'] });
  });
});
