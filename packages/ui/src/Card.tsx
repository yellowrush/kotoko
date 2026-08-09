import type { HTMLAttributes, ReactNode } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`kodoko-card p-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}
