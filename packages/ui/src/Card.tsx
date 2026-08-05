import type { HTMLAttributes, ReactNode } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}