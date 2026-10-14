import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#E4E7EC] bg-white/50',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-[#667085] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#101828] mb-1">{title}</h3>
      <p className="text-sm text-[#667085] max-w-sm mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

