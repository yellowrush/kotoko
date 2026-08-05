import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  info: 'bg-sky-100 text-sky-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children?: ReactNode;
};

export function Badge({ variant = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </span>
  );
}