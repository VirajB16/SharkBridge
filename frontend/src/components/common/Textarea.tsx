import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className, id, required, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-[#101828] mb-1.5">
            {label} {required && <span className="text-[#C43232]">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          required={required}
          className={twMerge(
            'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#101828] placeholder-[#98A2B3] transition-colors focus:outline-none focus:ring-2 sm:leading-6',
            error
              ? 'border-[#C43232] focus:border-[#C43232] focus:ring-[#C43232]/20'
              : 'border-[#E4E7EC] focus:border-[#101828] focus:ring-[#101828]/10',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-[#C43232]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

