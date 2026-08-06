import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { findMunicipality } from '@kodoko/domain';
import type { LeafResult } from '@kodoko/policy-engine';
import { usePolicyDetail, usePolicyMatches, usePolicyTasks } from '../hooks/usePolicies';
import { daysUntil } from '../lib/policy';
import { PolicyStatusBadge } from '../components/PolicyStatusBadge';
import { PageHeader } from '../components/PageHeader';

const STATUS_ACTIONS = ['planned', 'completed', 'dismissed'] as const;

type LeafReason =
  | { type: 'ageMonths'; months: number }
  | { type: 'municipality'; name: string };

function leafReason(leaf: LeafResult): LeafReason | null {
  if (leaf.field === 'child.ageMonths' && typeof leaf.actual === 'number') {
    return { type: 'ageMonths', months: leaf.actual };
  }
  if (leaf.field === 'user.municipalityCode') {
    return {
      type: 'municipality',
      name: findMunicipality(String(leaf.actual))?.nameJa ?? String(leaf.actual ?? ''),
    };
  }
  return null;
}

export function PolicyDetailPage() {
  const { t } = useTranslation();
  const { policyId } = useParams();
  const { data: policy, isLoading, isError, refetch } = usePolicyDetail(policyId);
  const matches = usePolicyMatches();
  const { setStatus, statusFor } = usePolicyTasks();

  const check = policyId ? matches.get(policyId) : undefined;
  const currentStatus = policyId ? statusFor(policyId) : 'new';

  useEffect(() => {
    if (policyId && currentStatus === 'new') void setStatus(policyId, 'viewed');
  }, [policyId, currentStatus, setStatus]);

  if (isLoading) {
    return <p className="text-gray-400">{t('common.loading')}</p>;
  }

  if (isError || !policy) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-500">
        <p>{t('common.error')}</p>
        <button type="button" onClick={() => void refetch()} className="text-brand-700">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={policy.title} />

      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
        {t(`policies.level.${policy.authorityLevel}`)}
      </span>

      {policy.contextHint && (
        <p className="mt-3 text-sm text-gray-600">{policy.contextHint}</p>
      )}

      <section className="mt-4 rounded-xl bg-white p-3">
        <h2 className="text-sm font-semibold text-gray-600">{t('policies.condition')}</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {(check?.leaves ?? []).map((leaf, index) => {
            const reason = leafReason(leaf);
            return (
              <li key={index} className="flex items-center gap-2 text-sm">
                {leaf.matched ? (
                  <span className="shrink-0 text-emerald-600" aria-label={t('policies.condition.matched')}>
                    ✓
                  </span>
                ) : (
                  <span className="shrink-0 text-red-600" aria-label={t('policies.condition.notMatched')}>
                    ✗
                  </span>
                )}
                <span className={leaf.matched ? 'text-gray-700' : 'text-gray-400'}>
                  {reason?.type === 'ageMonths'
                    ? t('policies.condition.ageMonths', { months: reason.months })
                    : reason?.type === 'municipality'
                      ? t('policies.condition.municipality', { name: reason.name })
                      : t('policies.condition.other')}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-3 flex flex-col gap-1 rounded-xl bg-white p-3 text-sm text-gray-600">
        {policy.applicationStartAt && (
          <p>
            {t('policies.applicationStart')}: {policy.applicationStartAt.slice(0, 10)}
          </p>
        )}
        {policy.applicationDeadlineAt && (
          <p>
            {t('policies.deadline')}: {policy.applicationDeadlineAt.slice(0, 10)}
            {daysUntil(policy.applicationDeadlineAt) >= 0 &&
              `（${t('policies.daysLeft', { days: daysUntil(policy.applicationDeadlineAt) })}）`}
          </p>
        )}
        <p>
          {t('policies.sourceChecked')}: {policy.sourceCheckedAt.slice(0, 10)} (v{policy.version})
        </p>
        <p>
          <a href={policy.officialUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
            {t('policies.officialLink')} ↗
          </a>
        </p>
      </section>

      <section className="mt-3 rounded-xl bg-amber-50 p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-amber-700">{t('policies.status.current')}</h2>
          <PolicyStatusBadge status={currentStatus} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => void setStatus(policy.id, action)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                currentStatus === action
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200'
              }`}
            >
              {t(`policies.actions.${action}`)}
            </button>
          ))}
        </div>
      </section>

      <p className="mt-3 text-xs text-gray-400">{t('policies.disclaimer')}</p>

      <Link to="/policies" className="mt-6 block text-sm text-gray-500">
        ← {t('policies.backToList')}
      </Link>
    </div>
  );
}