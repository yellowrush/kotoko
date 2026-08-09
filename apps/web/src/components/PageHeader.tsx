import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';

export function PagePlaceholder({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="kodoko-card flex flex-col items-center gap-3 px-5 py-12 text-center">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <p className="max-w-sm text-sm font-medium text-gray-500">
        {description}
      </p>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  action,
  backTo,
}: {
  title: string;
  action?: ReactNode;
  /** 设置后会在标题上方左侧渲染一个返回按钮。 */
  backTo?: string;
}) {
  const { t } = useAppTranslation();
  return (
    <div className="mb-4">
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex min-h-10 items-center rounded-full border border-brand-100 bg-white/80 px-3 text-sm font-semibold text-gray-600 shadow-sm hover:bg-brand-50 hover:text-brand-700"
        >
          ← {t('common.back')}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold leading-tight text-gray-900">
          {title}
        </h1>
        {action}
      </div>
    </div>
  );
}
