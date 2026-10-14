import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Briefcase
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AlertBanner } from '../components/common/AlertBanner';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-accent/10 border border-teal-accent/30 text-[#101828] text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-teal-dark" />
          AI-Assisted SME Funding Discovery
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#101828] tracking-tight leading-tight">
          Funding connections for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#101828] via-[#149B9D] to-[#22C7C9]">businesses with ambition.</span>
        </h1>
        
        <p className="mt-6 text-lg sm:text-xl text-[#667085] max-w-2xl mx-auto leading-relaxed">
          Present your business clearly, discover relevant investors, and track funding conversations in one place.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Explore How It Works
            </Button>
          </a>
        </div>

        {/* Disclaimer Notice */}
        <div className="mt-10 max-w-xl mx-auto">
          <AlertBanner
            type="info"
            message={
              <span>
                <strong>Important Notice:</strong> SharkBridge is a discovery platform. SharkBridge does not guarantee funding or verify all submitted claims. AI outputs organize submitted data and do not constitute financial advice.
              </span>
            }
          />
        </div>
      </section>

      {/* Role Choice Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="hover:border-teal-accent/50 transition-all border-[#E4E7EC] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-teal-accent/15 flex items-center justify-center text-teal-dark mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#101828] mb-2">For Entrepreneurs</h3>
            <p className="text-sm text-[#667085] leading-relaxed mb-4">
              Create a structured profile of your business, get AI assistance identifying missing data, discover investors actively seeking businesses in your sector, and submit direct funding applications.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                Structured business profile with revenue/expense figures in INR
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                AI-generated summary and missing-data checks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                Transparent match scoring based on investor criteria
              </li>
            </ul>
          </div>
          <Link to="/signup?role=entrepreneur">
            <Button variant="primary" className="w-full">
              Sign Up as Entrepreneur
            </Button>
          </Link>
        </Card>

        <Card className="hover:border-teal-accent/50 transition-all border-[#E4E7EC] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#101828]/10 flex items-center justify-center text-[#101828] mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#101828] mb-2">For Investors</h3>
            <p className="text-sm text-[#667085] leading-relaxed mb-4">
              Set sector preferences, funding brackets, and preferred stages. Review concise AI-distilled business applications, see match justifications, and update application status securely.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                Clear criteria: sectors, ticket size (INR), business stages
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                Concise executive summaries distilled from entrepreneur submissions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                Streamlined workflow: Under Review, Request Info, Interested, Declined
              </li>
            </ul>
          </div>
          <Link to="/signup?role=investor">
            <Button variant="secondary" className="w-full">
              Sign Up as Investor
            </Button>
          </Link>
        </Card>
      </section>

      {/* 3 Steps Section */}
      <section id="how-it-works" className="max-w-5xl mx-auto pt-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#101828]">
            How SharkBridge Works
          </h2>
          <p className="text-sm sm:text-base text-[#667085] mt-2">
            A 3-step structured pathway to connect growing businesses with relevant capital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-sm relative">
            <div className="w-10 h-10 rounded-lg bg-[#101828] text-white font-bold flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-base font-semibold text-[#101828] mb-2">Build a Profile</h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              Entrepreneurs enter business details, funding request in INR, stage, and growth plans. Plain language; no confusing jargon.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-sm relative">
            <div className="w-10 h-10 rounded-lg bg-teal-dark text-white font-bold flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-base font-semibold text-[#101828] mb-2">Get AI-Assisted Insights</h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              Our server-side AI synthesizes key highlights and flags missing information based strictly on submitted data. Zero hallucinated metrics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-sm relative">
            <div className="w-10 h-10 rounded-lg bg-[#101828] text-white font-bold flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-base font-semibold text-[#101828] mb-2">Connect with Investors</h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              Explore investors matched by transparent criteria (sector, amount, stage). Submit funding requests and track review status in real time.
            </p>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section id="principles" className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-[#E4E7EC] shadow-sm">
        <h3 className="text-xl font-bold text-[#101828] mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-teal-dark" />
          Our Product Principles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#667085]">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-1">AI assists; people decide</h4>
            <p>AI organizes and summarizes; investors review and make all investment choices themselves.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-1">Transparent Matching</h4>
            <p>Scores are deterministic based on stated preferences (sectors, ticket sizes, stages), not black-box predictions.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-1">No Hallucinated Figures</h4>
            <p>Missing metrics are explicitly labeled as "Not provided" rather than invented.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-1">Privacy & Role Security</h4>
            <p>Private application details are strictly restricted to the applicant entrepreneur and target investor.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

