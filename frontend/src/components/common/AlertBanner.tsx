import React from 'react';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success' | 'ai';
  title?: string;
  message: string | React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className,
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-50/80 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50/80 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-[#B7791F] flex-shrink-0" />,
    },
    error: {
      bg: 'bg-red-50/80 border-red-200 text-[#C43232]',
      icon: <AlertCircle className="w-5 h-5 text-[#C43232] flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
      icon: <CheckCircle className="w-5 h-5 text-[#168A62] flex-shrink-0" />,
    },
    ai: {
      bg: 'bg-[#F0FDF4] border-[#86EFAC] text-[#14532D]',
      icon: (
        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#22C7C9] text-[#101828]">
          AI
        </span>
      ),
    },
  };

  const current = styles[type];

  return (
    <div
      role="alert"
      className={twMerge(
        'p-4 rounded-xl border flex items-start gap-3 text-sm transition-all',
        current.bg,
        className
      )}
    >
      <div className="pt-0.5">{current.icon}</div>
      <div className="flex-1">
        {title && <h4 className="font-semibold text-sm mb-0.5">{title}</h4>}
        <div className="text-xs sm:text-sm leading-relaxed">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100 p-1 -mr-1 rounded-md"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

