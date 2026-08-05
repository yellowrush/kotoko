import { calculateAgeMonths, isValidBirthDate, type PolicyRule, type PolicyOperator } from '@kodoko/domain';

export type PolicyContext = {
  child?: {
    birthDate?: string;
    ageMonths?: number;
    interests?: string[];
    accessibilityNeeds?: string[];
  };
  user?: {
    municipalityCode?: string;
    isLoggedIn?: boolean;
  };
  today?: string;
};

export type MatchResult = {
  matched: boolean;
  reasons: string[];
};

function resolveField(context: PolicyContext, field: string): unknown {
  const path = field.split('.');
  let current: unknown = context;
  for (const segment of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function resolveValue(context: PolicyContext, field: string): unknown {
  if (field === 'today') return context.today ?? new Date().toISOString().slice(0, 10);
  if (field === 'child.ageMonths' && context.child?.birthDate && context.child.ageMonths === undefined) {
    return calculateAgeMonths(context.child.birthDate, context.today ? new Date(context.today) : new Date());
  }
  return resolveField(context, field);
}

function compare(operator: PolicyOperator, actual: unknown, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'lt':
      return isFiniteNumber(actual) && isFiniteNumber(expected) && (actual as number) < (expected as number);
    case 'lte':
      return isFiniteNumber(actual) && isFiniteNumber(expected) && (actual as number) <= (expected as number);
    case 'gt':
      return isFiniteNumber(actual) && isFiniteNumber(expected) && (actual as number) > (expected as number);
    case 'gte':
      return isFiniteNumber(actual) && isFiniteNumber(expected) && (actual as number) >= (expected as number);
    case 'in':
      return Array.isArray(expected) && (expected as unknown[]).includes(actual);
    case 'notIn':
      return Array.isArray(expected) && !(expected as unknown[]).includes(actual);
    case 'contains':
      return Array.isArray(actual) && (actual as unknown[]).includes(expected);
    default:
      return false;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function evaluateRule(rule: PolicyRule, context: PolicyContext, reasons: string[]): boolean {
  if ('all' in rule && Array.isArray(rule.all)) {
    const results = rule.all.map((child) => evaluateRule(child, context, reasons));
    const matched = results.every(Boolean);
    if (!matched) {
      reasons.push(`All of ${rule.all.length} conditions not satisfied`);
    }
    return matched;
  }

  if ('any' in rule && Array.isArray(rule.any)) {
    const results = rule.any.map((child) => evaluateRule(child, context, reasons));
    const matched = results.some(Boolean);
    if (matched) {
      reasons.push(`At least one of ${rule.any.length} conditions satisfied`);
    } else {
      reasons.push(`None of ${rule.any.length} conditions satisfied`);
    }
    return matched;
  }

  if ('field' in rule) {
    const actual = resolveValue(context, rule.field);
    const matched = compare(rule.operator, actual, rule.value);
    reasons.push(`${rule.field} ${rule.operator} ${JSON.stringify(rule.value)} -> ${JSON.stringify(actual)} (${matched ? 'match' : 'no match'})`);
    return matched;
  }

  return false;
}

export function matchPolicy(rule: PolicyRule, context: PolicyContext): MatchResult {
  const reasons: string[] = [];
  const matched = evaluateRule(rule, context, reasons);
  return { matched, reasons };
}

export type ChildContextPartials = {
  interests?: string[];
  accessibilityNeeds?: string[];
};

export function childContext(birthDate: string, overrides: ChildContextPartials = {}): NonNullable<PolicyContext['child']> {
  return {
    birthDate,
    ageMonths: calculateAgeMonths(birthDate),
    interests: overrides.interests ?? [],
    accessibilityNeeds: overrides.accessibilityNeeds ?? [],
  };
}

const KNOWN_OPERATORS = new Set<PolicyOperator>(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'notIn', 'contains']);

export function isPolicyRule(value: unknown): value is PolicyRule {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;

  if ('all' in record || 'any' in record) {
    const group = ('all' in record ? record.all : record.any) as unknown;
    return Array.isArray(group) && group.every((item) => isPolicyRule(item));
  }

  if ('field' in record && 'operator' in record && 'value' in record) {
    return typeof record.field === 'string' && KNOWN_OPERATORS.has(record.operator as PolicyOperator);
  }

  return false;
}

export function validateBirthDateForContext(birthDate: string): boolean {
  return isValidBirthDate(birthDate);
}