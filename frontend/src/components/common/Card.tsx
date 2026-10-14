import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  subtitle,
  headerAction,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'bg-white rounded-xl border border-[#E4E7EC] shadow-sm overflow-hidden',
        className
      )}
      {...props}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-[#101828]">{title}</h3>}
            {subtitle && <p className="text-sm text-[#667085] mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

