import { useCallback, useEffect, useState } from 'react';
import type { UserPreference } from '@kodoko/domain';
import { getPreferenceRepository } from '../lib/db';

export function usePreference() {
  const [preference, setPreferenceState] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const value = await getPreferenceRepository().get();
    setPreferenceState(value);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const setMunicipality = useCallback(
    async (municipalityCode?: string) => {
      await getPreferenceRepository().set({ municipalityCode });
      await reload();
    },
    [reload],
  );

  return { preference, loading, setMunicipality };
}