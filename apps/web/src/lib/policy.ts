import { checkPolicy, childContext, type PolicyLeafCheck } from '@kodoko/policy-engine';
import type { Policy } from '@kodoko/domain';

export type PolicyContextInput = {
  birthDate?: string;
  municipalityCode?: string;
};

/** 所有匹配都在客户端执行，出生日期与居住地不会上传（AGENTS.md 9.1）。 */
export function checkPolicyFor(policy: Policy, input: PolicyContextInput): PolicyLeafCheck {
  return checkPolicy(policy.eligibilityRule, {
    child: input.birthDate ? childContext(input.birthDate) : undefined,
    user: input.municipalityCode ? { municipalityCode: input.municipalityCode } : undefined,
  });
}

export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}