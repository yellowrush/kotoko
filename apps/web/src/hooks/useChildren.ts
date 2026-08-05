import { useCallback, useEffect, useState } from 'react';
import type { ChildProfile, CreateChildInput, UpdateChildInput } from '@kodoko/domain';
import { getChildRepository } from '../lib/db';

export function useChildren() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    const list = await getChildRepository().list();
    setChildren(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: CreateChildInput) => {
      const repo = getChildRepository();
      setCreating(true);
      try {
        const created = await repo.create(input);
        await reload();
        return created;
      } finally {
        setCreating(false);
      }
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, input: UpdateChildInput) => {
      const repo = getChildRepository();
      const updated = await repo.update(id, input);
      await reload();
      return updated;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const repo = getChildRepository();
      await repo.remove(id);
      await reload();
    },
    [reload],
  );

  return { children, loading, creating, create, update, remove };
}