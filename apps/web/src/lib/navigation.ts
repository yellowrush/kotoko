export function detailBackTo(state: unknown, fallback: string): string {
  if (typeof state !== 'object' || state === null || !('backTo' in state)) {
    return fallback;
  }

  const backTo = (state as { backTo?: unknown }).backTo;
  return typeof backTo === 'string' && backTo.startsWith('/') ? backTo : fallback;
}
