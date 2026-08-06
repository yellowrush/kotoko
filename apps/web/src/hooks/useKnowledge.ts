import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchKnowledge, fetchKnowledgeDetail } from '@kodoko/api-client';
import type { KnowledgeContent } from '@kodoko/domain';
import { getApiClient } from '../lib/api';
import { getKnowledgeProgressRepository } from '../lib/db';
import { useActiveChild } from './useActiveChild';
import { i18n } from '../app/i18n';

function currentLocale(): string {
  const lang = i18n.language;
  if (lang === 'zh-CN' || lang === 'zh-TW' || lang === 'ja') return lang;
  return 'ja';
}

export function useKnowledge() {
  const locale = currentLocale();
  return useQuery<KnowledgeContent[]>({
    queryKey: ['knowledge', locale],
    queryFn: async () => fetchKnowledge(getApiClient(), { locale }),
  });
}

export function useKnowledgeDetail(knowledgeId: string | undefined) {
  const locale = currentLocale();
  return useQuery<KnowledgeContent>({
    queryKey: ['knowledge-detail', knowledgeId, locale],
    queryFn: async () => {
      if (!knowledgeId) throw new Error('missing knowledge id');
      return fetchKnowledgeDetail(getApiClient(), knowledgeId, locale);
    },
    enabled: !!knowledgeId,
  });
}

export function useKnowledgeProgress() {
  const { active } = useActiveChild();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const childId = active?.id;

  const reload = useCallback(async () => {
    const list = await getKnowledgeProgressRepository().listByChild(childId);
    setReadIds(new Set(list.map((k) => k.knowledgeId)));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const markRead = useCallback(
    async (knowledgeId: string) => {
      await getKnowledgeProgressRepository().markRead(childId, knowledgeId);
      setReadIds((prev) => new Set(prev).add(knowledgeId));
    },
    [childId],
  );

  return { readIds, loading, markRead };
}