import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPolicies, fetchPolicy } from '@kodoko/api-client';
import type { Policy, PolicyTaskState } from '@kodoko/domain';
import type { PolicyLeafCheck } from '@kodoko/policy-engine';
import { getApiClient } from '../lib/api';
import { getPolicyTaskRepository } from '../lib/db';
import { useActiveChild } from './useActiveChild';
import { usePreference } from './usePreference';
import { checkPolicyFor } from '../lib/policy';
import { i18n } from '../app/i18n';

function currentLocale(): string {
  const lang = i18n.language;
  if (lang === 'zh-CN' || lang === 'zh-TW' || lang === 'ja') return lang;
  return 'ja';
}

export function usePolicies() {
  const locale = currentLocale();
  return useQuery<Policy[]>({
    queryKey: ['policies', locale],
    queryFn: async () => fetchPolicies(getApiClient(), { locale }),
  });
}

export function usePolicyDetail(policyId: string | undefined) {
  const locale = currentLocale();
  return useQuery<Policy>({
    queryKey: ['policy-detail', policyId, locale],
    queryFn: async () => {
      if (!policyId) throw new Error('missing policy id');
      return fetchPolicy(getApiClient(), policyId, locale);
    },
    enabled: !!policyId,
  });
}

export function usePolicyMatches() {
  const { data: policies } = usePolicies();
  const { active } = useActiveChild();
  const { preference } = usePreference();

  return useMemo(() => {
    const map = new Map<string, PolicyLeafCheck>();
    for (const policy of policies ?? []) {
      map.set(
        policy.id,
        checkPolicyFor(policy, {
          birthDate: active?.birthDate,
          municipalityCode: preference?.municipalityCode,
        }),
      );
    }
    return map;
  }, [policies, active, preference]);
}

export function usePolicyTasks() {
  const { active } = useActiveChild();
  const [tasks, setTasks] = useState<Map<string, PolicyTaskState>>(new Map());
  const [loading, setLoading] = useState(true);
  const childId = active?.id;

  const reload = useCallback(async () => {
    const list = await getPolicyTaskRepository().listByChild(childId);
    setTasks(new Map(list.map((task) => [task.policyId, task])));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (policyId: string, status: PolicyTaskState['status']) => {
      const saved = await getPolicyTaskRepository().setStatus(childId, policyId, status);
      setTasks((prev) => new Map(prev).set(policyId, saved));
    },
    [childId],
  );

  const statusFor = useCallback(
    (policyId: string): PolicyTaskState['status'] => tasks.get(policyId)?.status ?? 'new',
    [tasks],
  );

  return { tasks, loading, setStatus, statusFor };
}