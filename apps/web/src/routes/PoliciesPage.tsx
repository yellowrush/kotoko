import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import type { Policy, PolicyTaskState } from '@kodoko/domain';
import { useActiveChild } from '../hooks/useActiveChild';
import { usePolicies, usePolicyMatches, usePolicyTasks } from '../hooks/usePolicies';
import { daysUntil } from '../lib/policy';
import { PolicyStatusBadge } from '../components/PolicyStatusBadge';
import { PageHeader } from '../components/PageHeader';

function PolicyItem({ policy, status }: { policy: Policy; status: PolicyTaskState['status'] }) {
  const { t } = useAppTranslation();
  return (
    <Link
      to={`/policies/${policy.id}`}
      className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/30"
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
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{policy.contextHint}</p>
        )}
        {policy.applicationDeadlineAt && (
          <p className="mt-2 text-sm text-gray-500">
            {t('policies.deadline')}: {policy.applicationDeadlineAt.slice(0, 10)}
            {daysUntil(policy.applicationDeadlineAt) >= 0 &&
              `（${t('policies.daysLeft', { days: daysUntil(policy.applicationDeadlineAt) })}）`}
          </p>
        )}
      </div>
    </Link>
  );
}

function PolicySection({
  title,
  policies,
  statusFor,
}: {
  title: string;
  policies: Policy[];
  statusFor: (policyId: string) => PolicyTaskState['status'];
}) {
  if (policies.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <ul className="flex flex-col gap-2">
        {policies.map((policy) => (
          <li key={policy.id}>
            <PolicyItem policy={policy} status={statusFor(policy.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PoliciesPage() {
  const { t } = useAppTranslation();
  const { data: policies, isLoading, isError, refetch } = usePolicies();
  const { active } = useActiveChild();
  const matches = usePolicyMatches();
  const { statusFor } = usePolicyTasks();

  const { newReminders, planned, applicable, notMatched } = useMemo(() => {
    const list = policies ?? [];
    const matched = active ? list.filter((p) => matches.get(p.id)?.matched) : list;
    return {
      newReminders: matched.filter((p) => statusFor(p.id) === 'new'),
      planned: matched.filter((p) => statusFor(p.id) === 'planned'),
      applicable: matched.filter((p) => !['new', 'planned'].includes(statusFor(p.id))),
      notMatched: active ? list.filter((p) => !matches.get(p.id)?.matched) : [],
    };
  }, [policies, active, matches, statusFor]);

  return (
    <div>
      <PageHeader title={t('policies.title')} backTo="/home" />

      {isLoading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <p>{t('common.error')}</p>
          <button type="button" onClick={() => void refetch()} className="text-brand-700">
            {t('common.retry')}
          </button>
        </div>
      )}

      {!isError && !active && <p className="mb-3 text-sm text-gray-500">{t('policies.noChild')}</p>}

      {!isError && (
        <div className="flex flex-col gap-4">
          {newReminders.length === 0 && planned.length === 0 && applicable.length === 0 ? (
            <p className="text-sm text-gray-500">{t('policies.noMatch')}</p>
          ) : (
            <>
              <PolicySection
                title={t('policies.sections.new')}
                policies={newReminders}
                statusFor={statusFor}
              />
              <PolicySection
                title={t('policies.sections.planned')}
                policies={planned}
                statusFor={statusFor}
              />
              <PolicySection
                title={t('policies.sections.applicable')}
                policies={applicable}
                statusFor={statusFor}
              />
            </>
          )}

          <PolicySection
            title={t('policies.sections.notApplicable')}
            policies={notMatched}
            statusFor={statusFor}
          />
        </div>
      )}
    </div>
  );
}
