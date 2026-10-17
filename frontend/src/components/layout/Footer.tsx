import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SharkBridgeLogo } from '../common/SharkBridgeLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E4E7EC] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <SharkBridgeLogo size="sm" />
            <span className="font-semibold text-sm text-[#101828]">
              SharkBridge Platform
            </span>
          </div>

          {/* Legal / AI disclaimer as required by PRD & Design Doc */}
          <div className="text-xs text-[#667085] text-center md:text-left max-w-xl leading-relaxed">
            <p className="flex items-center justify-center md:justify-start gap-1.5 font-medium text-gray-700 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-dark" />
              Transparent Matchmaking & AI Disclaimer
            </p>
            SharkBridge assists small businesses and investors in discovering funding opportunities.
            AI summaries and match scores are informational tools, not financial advice, credit ratings,
            or guarantees of investment. All business metrics are self-reported by applicants.
          </div>

          <div className="text-xs text-[#667085]">
            © {new Date().getFullYear()} SharkBridge. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

