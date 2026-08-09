import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant =
  'neutral' | 'info' | 'success' | 'warning' | 'danger';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-white/90 text-gray-700',
  info: 'bg-sky-100 text-sky-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children?: ReactNode;
};

export function Badge({
  variant = 'neutral',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`kodoko-badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
