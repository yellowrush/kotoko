import type { ReactNode } from 'react';

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

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold">{title}</h1>
      {action}
    </div>
  );
}