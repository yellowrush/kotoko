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
import { useLocale } from './useLocale';

export function usePolicies() {
  const { locale } = useLocale();
  return useQuery<Policy[]>({
    queryKey: ['policies', locale],
    queryFn: async () => fetchPolicies(getApiClient(), { locale }),
  });
}

export function usePolicyDetail(policyId: string | undefined) {
  const { locale } = useLocale();
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
  const childId = active?.id;

  return usePolicyTasksForChildren(childId ? [childId] : []);
}

export function usePolicyTasksForChildren(childIds: string[]) {
  const { active } = useActiveChild();
  const [tasks, setTasks] = useState<Map<string, PolicyTaskState>>(new Map());
  const [loading, setLoading] = useState(true);
  const scopeKey = childIds.join('|');
  const scopedChildIds = useMemo(() => (scopeKey ? scopeKey.split('|') : []), [scopeKey]);

  const reload = useCallback(async () => {
    const list = await getPolicyTaskRepository().listByChildren(scopedChildIds);
    setTasks(new Map(list.map((task) => [taskKey(task.childId, task.policyId), task])));
    setLoading(false);
  }, [scopedChildIds]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (policyId: string, status: PolicyTaskState['status'], childIdOverride?: string) => {
      const targetChildId = childIdOverride ?? active?.id;
      if (!targetChildId) return;
      const saved = await getPolicyTaskRepository().setStatus(targetChildId, policyId, status);
      setTasks((prev) => new Map(prev).set(taskKey(targetChildId, policyId), saved));
    },
    [active?.id],
  );

  const statusFor = useCallback(
    (policyId: string, childIdOverride?: string): PolicyTaskState['status'] => {
      const targetChildId = childIdOverride ?? active?.id;
      if (!targetChildId) return 'new';
      return tasks.get(taskKey(targetChildId, policyId))?.status ?? 'new';
    },
    [tasks, active?.id],
  );

  return { tasks, loading, setStatus, statusFor };
}

function taskKey(childId: string | undefined, policyId: string): string {
  return `${childId ?? 'none'}:${policyId}`;
}
