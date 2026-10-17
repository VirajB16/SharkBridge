import React from 'react';
import logoImg from '../../assets/sharkbridge-logo.png';

interface SharkBridgeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export const SharkBridgeLogo: React.FC<SharkBridgeLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  textClassName = '',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const imgClass = sizeMap[size] || 'w-9 h-9';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoImg}
        alt="SharkBridge"
        className={`${imgClass} object-contain transition-transform hover:scale-105`}
      />
      {showText && (
        <div className={`flex flex-col ${textClassName}`}>
          <span className="font-bold text-lg tracking-tight text-[#101828] leading-tight">
            Shark<span className="text-[#0D828A]">Bridge</span>
          </span>
          <span className="text-[10px] text-[#667085] font-medium tracking-wide">
            SME FUNDING MATCH
          </span>
        </div>
      )}
    </div>
  );
};
