import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDynamicImportFetchError, lazyWithStaleAssetRecovery } from './staleAssets';

describe('isDynamicImportFetchError', () => {
  it('detects stale dynamic import failures', () => {
    expect(isDynamicImportFetchError(new TypeError('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isDynamicImportFetchError(new TypeError('Importing a module script failed'))).toBe(true);
    expect(isDynamicImportFetchError(new Error('error loading dynamically imported module'))).toBe(true);
  });

  it('does not classify ordinary application errors as stale assets', () => {
    expect(isDynamicImportFetchError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isDynamicImportFetchError('Failed to fetch dynamically imported module')).toBe(false);
  });
});

describe('lazyWithStaleAssetRecovery', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('passes through successful lazy imports and clears stale retry state', async () => {
    window.sessionStorage.setItem('kodoko:stale-asset-retry-at', String(Date.now()));

    await expect(lazyWithStaleAssetRecovery(() => Promise.resolve({ ok: true }))).resolves.toEqual({ ok: true });
    expect(window.sessionStorage.getItem('kodoko:stale-asset-retry-at')).toBeNull();
  });

  it('rethrows non dynamic import errors', async () => {
    await expect(lazyWithStaleAssetRecovery(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
