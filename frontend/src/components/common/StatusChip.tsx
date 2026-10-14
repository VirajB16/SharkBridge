import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApplicationStatus } from '../../types';

export interface StatusChipProps {
  status: ApplicationStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  submitted: {
    label: 'Submitted',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  request_information: {
    label: 'Request Information',
    bg: 'bg-amber-50',
    text: 'text-[#B7791F]',
    dot: 'bg-[#B7791F]',
  },
  interested: {
    label: 'Interested',
    bg: 'bg-emerald-50',
    text: 'text-[#168A62]',
    dot: 'bg-[#168A62]',
  },
  declined: {
    label: 'Declined',
    bg: 'bg-red-50',
    text: 'text-[#C43232]',
    dot: 'bg-[#C43232]',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  className,
  size = 'md',
}) => {
  const normalizedKey = status.toLowerCase().replace(/\s+/g, '_');
  const config = statusConfig[normalizedKey] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={twMerge(
        'inline-flex items-center font-medium rounded-full gap-1.5 transition-colors',
        config.bg,
        config.text,
        sizeClasses,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

