import type { ApiClient } from './client';
import { policyListSchema, policySchema, type PolicyDTO } from './schemas';

export type PolicyQuery = {
  locale?: string;
};

function buildQueryString(query: PolicyQuery): string {
  const params = new URLSearchParams();
  if (query.locale) params.set('locale', query.locale);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchPolicies(
  client: ApiClient,
  query: PolicyQuery = {},
): Promise<PolicyDTO[]> {
  const data = await client.get<unknown>(`/policies${buildQueryString(query)}`);
  const parsed = policyListSchema.parse(data);
  return parsed.policies;
}

export async function fetchPolicy(
  client: ApiClient,
  policyId: string,
  locale?: string,
): Promise<PolicyDTO> {
  const data = await client.get<unknown>(
    `/policies/${policyId}${buildQueryString({ locale })}`,
  );
  return policySchema.parse(data);
}