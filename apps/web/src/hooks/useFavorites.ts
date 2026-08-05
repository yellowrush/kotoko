import { useCallback, useEffect, useState } from 'react';
import { getFavoriteRepository } from '../lib/db';
import { useActiveChild } from './useActiveChild';

export function useFavorites() {
  const { active } = useActiveChild();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const childId = active?.id;

  const reload = useCallback(async () => {
    const list = await getFavoriteRepository().listByChild(childId);
    setFavoriteIds(new Set(list.map((f) => f.placeId)));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const toggle = useCallback(
    async (placeId: string) => {
      const repo = getFavoriteRepository();
      if (favoriteIds.has(placeId)) {
        await repo.removeByPlace(childId, placeId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(placeId);
          return next;
        });
      } else {
        await repo.add(childId, placeId);
        setFavoriteIds((prev) => new Set(prev).add(placeId));
      }
    },
    [childId, favoriteIds],
  );

  return { favoriteIds, loading, toggle };
}