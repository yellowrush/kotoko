const STALE_ASSET_RETRY_KEY = 'kodoko:stale-asset-retry-at';
const RETRY_WINDOW_MS = 60_000;

export function isDynamicImportFetchError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    error.message,
  );
}

function canRetryStaleAssetReload() {
  try {
    const previous = Number(window.sessionStorage.getItem(STALE_ASSET_RETRY_KEY));
    return !Number.isFinite(previous) || Date.now() - previous > RETRY_WINDOW_MS;
  } catch {
    return true;
  }
}

function markStaleAssetReloadAttempt() {
  try {
    window.sessionStorage.setItem(STALE_ASSET_RETRY_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; the reload still gives the app a chance to recover.
  }
}

function clearStaleAssetReloadAttempt() {
  try {
    window.sessionStorage.removeItem(STALE_ASSET_RETRY_KEY);
  } catch {
    // Session storage is best-effort only.
  }
}

async function resetServiceWorkerAndCaches() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }
}

export async function recoverFromStaleAssets(error: unknown) {
  if (!isDynamicImportFetchError(error) || !canRetryStaleAssetReload()) {
    throw error;
  }

  markStaleAssetReloadAttempt();
  await resetServiceWorkerAndCaches();
  window.location.reload();
}

export function lazyWithStaleAssetRecovery<T>(importer: () => Promise<T>) {
  return importer()
    .then((module) => {
      clearStaleAssetReloadAttempt();
      return module;
    })
    .catch(async (error: unknown) => {
      await recoverFromStaleAssets(error);
      return new Promise<T>(() => undefined);
    });
}
