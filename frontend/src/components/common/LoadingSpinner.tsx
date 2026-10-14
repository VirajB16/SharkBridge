import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 'md',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={twMerge('flex flex-col items-center justify-center p-6', className)}>
      <div
        className={twMerge(
          'animate-spin rounded-full border-t-transparent border-[#101828]',
          sizeClasses[size]
        )}
      />
      {text && <p className="mt-3 text-sm text-[#667085] font-medium">{text}</p>}
    </div>
  );
};

