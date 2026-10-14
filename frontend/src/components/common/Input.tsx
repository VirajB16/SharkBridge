import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefixText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, prefixText, className, id, required, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#101828] mb-1.5">
            {label} {required && <span className="text-[#C43232]">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {prefixText && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-[#667085] sm:text-sm font-medium">{prefixText}</span>
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            required={required}
            className={twMerge(
              'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#101828] placeholder-[#98A2B3] transition-colors focus:outline-none focus:ring-2 sm:leading-6',
              prefixText ? 'pl-9' : '',
              error
                ? 'border-[#C43232] focus:border-[#C43232] focus:ring-[#C43232]/20'
                : 'border-[#E4E7EC] focus:border-[#101828] focus:ring-[#101828]/10',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-[#C43232]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

