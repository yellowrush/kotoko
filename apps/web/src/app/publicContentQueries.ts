import type { QueryClient } from '@tanstack/react-query';

const PUBLIC_CONTENT_QUERY_KEYS = [
  ['places'],
  ['place'],
  ['knowledge'],
  ['knowledge-detail'],
  ['policies'],
  ['policy-detail'],
] as const;

export function invalidatePublicContentQueries(queryClient: QueryClient): Promise<void[]> {
  return Promise.all(
    PUBLIC_CONTENT_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
