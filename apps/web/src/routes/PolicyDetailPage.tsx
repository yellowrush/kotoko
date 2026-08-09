import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { findMunicipality, type PolicyTaskState } from '@kodoko/domain';
import type { LeafResult } from '@kodoko/policy-engine';
import {
  usePolicyDetail,
  usePolicyTasksForChildren,
} from '../hooks/usePolicies';
import { checkPolicyFor, daysUntil } from '../lib/policy';
import { PolicyStatusBadge } from '../components/PolicyStatusBadge';
import { PageHeader } from '../components/PageHeader';
import { useChildren } from '../hooks/useChildren';
import { usePreference } from '../hooks/usePreference';
import { detailBackTo } from '../lib/navigation';

const STATUS_ACTIONS = ['planned', 'completed', 'dismissed'] as const;

type LeafReason =
  | { type: 'ageMonths'; months: number }
  | { type: 'municipality'; name: string };

type AgeSummary = {
  months?: number;
  min?: number;
  max?: number;
  matched: boolean;
};

function summarizeAgeLeaves(leaves: LeafResult[]): AgeSummary | null {
  const ageLeaves = leaves.filter((leaf) => leaf.field === 'child.ageMonths');
  if (ageLeaves.length === 0) return null;

  const monthsLeaf = ageLeaves.find((leaf) => typeof leaf.actual === 'number');
  const gteValues = ageLeaves
    .filter(
      (leaf) => leaf.operator === 'gte' && typeof leaf.expected === 'number',
    )
    .map((leaf) => leaf.expected as number);
  const lteValues = ageLeaves
    .filter(
      (leaf) => leaf.operator === 'lte' && typeof leaf.expected === 'number',
    )
    .map((leaf) => leaf.expected as number);

  return {
    months:
      typeof monthsLeaf?.actual === 'number' ? monthsLeaf.actual : undefined,
    min: gteValues.length > 0 ? Math.max(...gteValues) : undefined,
    max: lteValues.length > 0 ? Math.min(...lteValues) : undefined,
    matched: ageLeaves.every((leaf) => leaf.matched),
  };
}

function leafReason(leaf: LeafResult): LeafReason | null {
  if (leaf.field === 'child.ageMonths' && typeof leaf.actual === 'number') {
    return { type: 'ageMonths', months: leaf.actual };
  }
  if (leaf.field === 'user.municipalityCode') {
    return {
      type: 'municipality',
      name:
        findMunicipality(String(leaf.actual))?.nameJa ??
        String(leaf.actual ?? ''),
    };
  }
  return null;
}

export function PolicyDetailPage() {
  const { t } = useAppTranslation();
  const location = useLocation();
  const { policyId } = useParams();
  const {
    data: policy,
    isLoading,
    isError,
    refetch,
  } = usePolicyDetail(policyId);
  const { children } = useChildren();
  const { preference } = usePreference();
  const childIds = useMemo(() => children.map((child) => child.id), [children]);
  const { setStatus, statusFor } = usePolicyTasksForChildren(childIds);
  const backTo = detailBackTo(location.state, '/policies');

  const policyChecks = useMemo(() => {
    if (!policy) return [];
    return children.map((child) => ({
      child,
      check: checkPolicyFor(policy, {
        birthDate: child.birthDate,
        municipalityCode: preference?.municipalityCode,
      }),
    }));
  }, [policy, children, preference]);
  const matchedPolicyChecks = useMemo(
    () => policyChecks.filter((item) => item.check.matched),
    [policyChecks],
  );
  const targetPolicyChecks =
    matchedPolicyChecks.length > 0 ? matchedPolicyChecks : policyChecks;
  const check = matchedPolicyChecks[0]?.check ?? policyChecks[0]?.check;
  const currentStatus =
    policy && targetPolicyChecks.length > 0
      ? bestPolicyStatus(
          targetPolicyChecks.map(({ child }) => statusFor(policy.id, child.id)),
        )
      : 'new';

  const setStatusForTargets = useCallback(
    async (status: PolicyTaskState['status']) => {
      if (!policy || targetPolicyChecks.length === 0) return;
      await Promise.all(
        targetPolicyChecks.map(({ child }) =>
          setStatus(policy.id, status, child.id),
        ),
      );
    },
    [policy, setStatus, targetPolicyChecks],
  );

  useEffect(() => {
    if (currentStatus === 'new') void setStatusForTargets('viewed');
  }, [currentStatus, setStatusForTargets]);

  if (isLoading) {
    return <p className="text-gray-400">{t('common.loading')}</p>;
  }

  if (isError || !policy) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-500">
        <p>{t('common.error')}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-brand-700"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={policy.title} backTo={backTo} />

      <span className="kodoko-badge rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
        {t(`policies.level.${policy.authorityLevel}`)}
      </span>

      {policy.contextHint && (
        <p className="mt-3 text-sm text-gray-600">{policy.contextHint}</p>
      )}

      <section className="kodoko-panel mt-4 p-3">
        <h2 className="text-sm font-semibold text-gray-600">
          {t('policies.conditions')}
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {(() => {
            const leaves = check?.leaves ?? [];
            const age = summarizeAgeLeaves(leaves);
            const otherLeaves = leaves.filter(
              (leaf) => leaf.field !== 'child.ageMonths',
            );
            const rows: { matched: boolean; text: string }[] = [];

            if (age) {
              const ageText =
                age.months === undefined
                  ? t('policies.condition.ageMonthsUnknown')
                  : age.min !== undefined && age.max !== undefined
                    ? t('policies.condition.ageMonths', {
                        min: age.min,
                        max: age.max,
                        months: age.months,
                      })
                    : age.min !== undefined
                      ? t('policies.condition.ageMonthsFrom', {
                          min: age.min,
                          months: age.months,
                        })
                      : age.max !== undefined
                        ? t('policies.condition.ageMonthsTo', {
                            max: age.max,
                            months: age.months,
                          })
                        : t('policies.condition.ageMonthsPlain', {
                            months: age.months,
                          });
              rows.push({ matched: age.matched, text: ageText });
            }

            for (const leaf of otherLeaves) {
              const reason = leafReason(leaf);
              const text =
                reason?.type === 'municipality'
                  ? t('policies.condition.municipality', { name: reason.name })
                  : t('policies.condition.other');
              rows.push({ matched: leaf.matched, text });
            }

            return rows.map((row, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                {row.matched ? (
                  <span
                    className="shrink-0 text-emerald-600"
                    aria-label={t('policies.condition.matched')}
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    className="shrink-0 text-red-600"
                    aria-label={t('policies.condition.notMatched')}
                  >
                    ✗
                  </span>
                )}
                <span
                  className={row.matched ? 'text-gray-700' : 'text-gray-400'}
                >
                  {row.text}
                </span>
              </li>
            ));
          })()}
        </ul>
      </section>

      <section className="kodoko-panel mt-3 flex flex-col gap-1 p-3 text-sm text-gray-600">
        {policy.applicationStartAt && (
          <p>
            {t('policies.applicationStart')}:{' '}
            {policy.applicationStartAt.slice(0, 10)}
          </p>
        )}
        {policy.applicationDeadlineAt && (
          <p>
            {t('policies.deadline')}:{' '}
            {policy.applicationDeadlineAt.slice(0, 10)}
            {daysUntil(policy.applicationDeadlineAt) >= 0 &&
              `（${t('policies.daysLeft', { days: daysUntil(policy.applicationDeadlineAt) })}）`}
          </p>
        )}
        <p>
          {t('policies.sourceChecked')}: {policy.sourceCheckedAt.slice(0, 10)}{' '}
          (v{policy.version})
        </p>
        <p>
          <a
            href={policy.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 hover:underline"
          >
            {t('policies.officialLink')} ↗
          </a>
        </p>
      </section>

      <section className="kodoko-panel mt-3 bg-amber-50/80 p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-amber-700">
            {t('policies.status.current')}
          </h2>
          <PolicyStatusBadge status={currentStatus} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => void setStatusForTargets(action)}
              className={`min-h-10 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                currentStatus === action
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-brand-100'
              }`}
            >
              {t(`policies.actions.${action}`)}
            </button>
          ))}
        </div>
      </section>

      <p className="mt-3 text-xs text-gray-400">{t('policies.disclaimer')}</p>
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
