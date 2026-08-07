import { useCallback, useEffect, useState } from 'react';
import type { PlaceComment } from '@kodoko/domain';
import { getPlaceCommentRepository } from '../lib/db';

export function usePlaceComments(placeId: string) {
  const [comments, setComments] = useState<PlaceComment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setComments(await getPlaceCommentRepository().listByPlace(placeId));
    setLoading(false);
  }, [placeId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const add = useCallback(
    async (input: { rating: number; content: string }) => {
      await getPlaceCommentRepository().add({ placeId, ...input });
      await reload();
    },
    [placeId, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await getPlaceCommentRepository().remove(id);
      await reload();
    },
    [reload],
  );

  return { comments, loading, add, remove };
}