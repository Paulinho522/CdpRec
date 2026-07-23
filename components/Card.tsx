import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`animate-fade-in rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 ${className}`}
    >
      {children}
    </div>
  );
}
