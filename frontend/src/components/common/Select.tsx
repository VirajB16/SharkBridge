import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, placeholder, className, id, required, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#101828] mb-1.5">
            {label} {required && <span className="text-[#C43232]">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          required={required}
          className={twMerge(
            'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#101828] transition-colors focus:outline-none focus:ring-2 sm:leading-6',
            error
              ? 'border-[#C43232] focus:border-[#C43232] focus:ring-[#C43232]/20'
              : 'border-[#E4E7EC] focus:border-[#101828] focus:ring-[#101828]/10',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-[#C43232]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

