import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
    <section className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-gray-500">{description}</p>
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
  const { t } = useTranslation();
  return (
    <div className="mb-4">
      {backTo && (
        <Link
          to={backTo}
          className="mb-1 inline-flex items-center text-sm font-medium text-gray-600 hover:text-brand-700"
        >
          ← {t('common.back')}
        </Link>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        {action}
      </div>
    </div>
  );
}