import type { ApiClient } from './client';
import { knowledgeListSchema, knowledgeSchema, type KnowledgeDTO } from './schemas';

export type KnowledgeQuery = {
  locale?: string;
};

function buildQueryString(query: KnowledgeQuery): string {
  const params = new URLSearchParams();
  if (query.locale) params.set('locale', query.locale);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchKnowledge(
  client: ApiClient,
  query: KnowledgeQuery = {},
): Promise<KnowledgeDTO[]> {
  const data = await client.get<unknown>(`/knowledge${buildQueryString(query)}`);
  const parsed = knowledgeListSchema.parse(data);
  return parsed.knowledge;
}

export async function fetchKnowledgeDetail(
  client: ApiClient,
  knowledgeId: string,
  locale?: string,
): Promise<KnowledgeDTO> {
  const data = await client.get<unknown>(`/knowledge/${knowledgeId}${buildQueryString({ locale })}`);
  return knowledgeSchema.parse(data);
}