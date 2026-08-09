import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import type { Policy, PolicyTaskState } from '@kodoko/domain';
import { useChildren } from '../hooks/useChildren';
import { usePolicies, usePolicyTasksForChildren } from '../hooks/usePolicies';
import { checkPolicyFor, daysUntil } from '../lib/policy';
import { usePreference } from '../hooks/usePreference';
import { PolicyStatusBadge } from '../components/PolicyStatusBadge';
import { PageHeader } from '../components/PageHeader';

type PolicyListItem = {
  policy: Policy;
  status: PolicyTaskState['status'];
};

type PolicyView = 'applicable' | 'notApplicable' | 'all';

const POLICY_VIEWS: PolicyView[] = ['applicable', 'notApplicable', 'all'];

function PolicyItem({
  policy,
  status,
}: {
  policy: Policy;
  status: PolicyTaskState['status'];
}) {
  const { t } = useAppTranslation();
  return (
    <Link
      to={`/policies/${policy.id}`}
      state={{ backTo: '/policies' }}
      className="kodoko-list-item grid grid-cols-[auto_1fr] gap-3 p-3 transition hover:border-brand-200 hover:bg-brand-50/30"
    >
      <span className="mt-0.5 text-xl" aria-hidden="true">
        📌
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <span className="min-w-0 truncate">{policy.title}</span>
          <PolicyStatusBadge status={status} />
        </p>
        {policy.contextHint && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {policy.contextHint}
          </p>
        )}
        {policy.applicationDeadlineAt && (
          <p className="mt-2 text-sm text-gray-500">
            {t('policies.deadline')}:{' '}
            {policy.applicationDeadlineAt.slice(0, 10)}
            {daysUntil(policy.applicationDeadlineAt) >= 0 &&
              `（${t('policies.daysLeft', { days: daysUntil(policy.applicationDeadlineAt) })}）`}
          </p>
        )}
      </div>
    </Link>
  );
}

export function PoliciesPage() {
  const { t } = useAppTranslation();
  const { data: policies, isLoading, isError, refetch } = usePolicies();
  const { children } = useChildren();
  const { preference } = usePreference();
  const [view, setView] = useState<PolicyView>('applicable');
  const childIds = useMemo(() => children.map((child) => child.id), [children]);
  const { statusFor } = usePolicyTasksForChildren(childIds);

  const { applicable, notMatched, all } = useMemo(() => {
    const list = policies ?? [];
    const unmatchedItems = list
      .filter(
        (policy) =>
          children.length === 0 ||
          !children.some(
            (child) =>
              checkPolicyFor(policy, {
                birthDate: child.birthDate,
                municipalityCode: preference?.municipalityCode,
              }).matched,
          ),
      )
      .map((policy) => ({ policy, status: 'new' as const }));

    const matchedItems = list
      .map((policy) => {
        const matchedChildren = children.filter(
          (child) =>
            checkPolicyFor(policy, {
              birthDate: child.birthDate,
              municipalityCode: preference?.municipalityCode,
            }).matched,
        );
        if (matchedChildren.length === 0) return null;

        const statuses = matchedChildren
          .map((child) => statusFor(policy.id, child.id))
          .filter((status) => status !== 'dismissed');
        if (statuses.length === 0) return null;

        return { policy, status: bestPolicyStatus(statuses) };
      })
      .filter((item): item is PolicyListItem => item !== null);

    return {
      applicable: matchedItems,
      notMatched: children.length > 0 ? unmatchedItems : [],
      all:
        children.length > 0
          ? [...matchedItems, ...unmatchedItems]
          : unmatchedItems,
    };
  }, [policies, children, preference, statusFor]);

  const visibleItems = useMemo(() => {
    switch (view) {
      case 'notApplicable':
        return notMatched;
      case 'all':
        return all;
      case 'applicable':
      default:
        return applicable;
    }
  }, [view, applicable, notMatched, all]);

  return (
    <div>
      <PageHeader title={t('policies.title')} backTo="/home" />

      {isLoading && (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <p>{t('common.error')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-brand-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!isError && children.length === 0 && (
        <p className="mb-3 text-sm text-gray-500">{t('policies.noChild')}</p>
      )}

      {!isError && !isLoading && (
        <div className="kodoko-segmented mb-4 flex p-1 text-sm">
          {POLICY_VIEWS.map((option) => {
            const activeOption =
              children.length === 0 && option !== 'all'
                ? false
                : view === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                disabled={children.length === 0 && option !== 'all'}
                className={`touch-target flex-1 rounded-[1.35rem] px-2 py-1 font-medium first:rounded-l-full last:rounded-r-full ${
                  activeOption
                    ? 'bg-white text-brand-800 shadow-sm'
                    : 'text-gray-500 hover:bg-white/50'
                } disabled:text-gray-300`}
              >
                {option === 'all'
                  ? t('knowledge.views.all')
                  : t(`policies.sections.${option}`)}
              </button>
            );
          })}
        </div>
      )}

      {!isError && !isLoading && visibleItems.length === 0 && (
        <p className="text-sm text-gray-500">{t('policies.noMatch')}</p>
      )}

      {!isError && (
        <ul className="flex flex-col gap-2">
          {visibleItems.map(({ policy, status }) => (
            <li key={policy.id}>
              <PolicyItem policy={policy} status={status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const POLICY_STATUS_PRIORITY: Record<PolicyTaskState['status'], number> = {
  new: 0,
  planned: 1,
  viewed: 2,
  completed: 3,
  dismissed: 4,
};

function bestPolicyStatus(
  statuses: PolicyTaskState['status'][],
): PolicyTaskState['status'] {
  return statuses.reduce((best, current) =>
    POLICY_STATUS_PRIORITY[current] < POLICY_STATUS_PRIORITY[best]
      ? current
      : best,
  );
}
