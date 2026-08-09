import { useCallback, useEffect, useState } from 'react';
import type { PlaceVisit } from '@kodoko/domain';
import { getPlaceVisitRepository } from '../lib/db';

export function usePlaceVisits() {
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setVisits(await getPlaceVisitRepository().list());
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const remove = useCallback(
    async (id: string) => {
      await getPlaceVisitRepository().remove(id);
      await reload();
    },
    [reload],
  );

  return { visits, loading, reload, remove };
}

export function usePlaceVisit(placeId: string | undefined) {
  const [visits, setVisits] = useState<PlaceVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!placeId) {
      setVisits([]);
      setLoading(false);
      return;
    }
    setVisits(await getPlaceVisitRepository().listByPlace(placeId));
    setLoading(false);
  }, [placeId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const recordToday = useCallback(async () => {
    if (!placeId) return null;
    const visit = await getPlaceVisitRepository().record({ placeId });
    await reload();
    return visit;
  }, [placeId, reload]);

  const remove = useCallback(
    async (id: string) => {
      await getPlaceVisitRepository().remove(id);
      await reload();
    },
    [reload],
  );

  return {
    visits,
    latestVisit: visits[0] ?? null,
    loading,
    recordToday,
    remove,
  };
}
