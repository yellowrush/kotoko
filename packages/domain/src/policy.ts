import type { ContentStatus } from './place';

export type AuthorityLevel = 'national' | 'prefecture' | 'municipality';

export type PolicyOperator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'notIn' | 'contains';

export type PolicyField =
  | 'child.ageMonths'
  | 'child.birthDate'
  | 'child.interests'
  | 'child.accessibilityNeeds'
  | 'user.municipalityCode'
  | 'user.isLoggedIn'
  | 'today';

export type PolicyRuleLeaf = {
  field: PolicyField;
  operator: PolicyOperator;
  value: unknown;
};

export type PolicyRule =
  | PolicyRuleLeaf
  | { all: PolicyRule[] }
  | { any: PolicyRule[] };

export type Policy = {
  id: string;
  title: string;
  contextHint?: string;
  authorityLevel: AuthorityLevel;
  municipalityCode?: string;
  eligibilityRule: PolicyRule;
  applicationStartAt?: string;
  applicationDeadlineAt?: string;
  officialUrl: string;
  sourceCheckedAt: string;
  version: number;
  status: ContentStatus;
};

/** 仅保存在本地的政策任务状态。 */
export type PolicyTaskState = {
  policyId: string;
  childId?: string;
  status: 'new' | 'viewed' | 'planned' | 'completed' | 'dismissed';
  reminderAt?: string;
  updatedAt: string;
};