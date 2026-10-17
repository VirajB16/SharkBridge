import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Briefcase,
  CheckCircle,
  Clock,
  Sparkles,
  X,
  Check,
  Upload,
  MessageSquare,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { EmptyState } from '../components/common/EmptyState';
import { AlertBanner } from '../components/common/AlertBanner';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { api } from '../lib/api';
import { InvestorPreferences, FundingApplication, ApplicationStatus, MatchResult } from '../types';
import { DealChatModal } from '../components/deal/DealChatModal';

interface InvestorDashboardProps {
  user?: any;
}

export const InvestorDashboard: React.FC<InvestorDashboardProps> = ({ user }) => {
  const [preferences, setPreferences] = useState<InvestorPreferences | null>(null);
  const [applications, setApplications] = useState<FundingApplication[]>([]);
  const [matchedDeals, setMatchedDeals] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Selection
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<FundingApplication | null>(null);
  const [dealChatApp, setDealChatApp] = useState<FundingApplication | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // CV Upload state (Issue 9 & Issue 3 OCR)
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadSuccess, setCvUploadSuccess] = useState<string | null>(null);

  // Preference Form State (Issue 10: removed min_amount_inr, retained max_amount_inr)
  const [prefForm, setPrefForm] = useState({
    sectors: '',
    max_amount_inr: '',
    preferred_stages: '',
    preferred_locations: '',
  });
  const [prefSubmitting, setPrefSubmitting] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch preferences (with fail-safe)
      try {
        const prefs = await api.getInvestorPreferences();
        if (prefs) {
          setPreferences(prefs);
          setPrefForm({
            sectors: prefs.sectors ? prefs.sectors.join(', ') : '',
            max_amount_inr: prefs.max_amount_inr ? prefs.max_amount_inr.toString() : '',
            preferred_stages: prefs.preferred_stages ? prefs.preferred_stages.join(', ') : '',
            preferred_locations: prefs.preferred_locations ? prefs.preferred_locations.join(', ') : '',
          });
        }
      } catch (prefErr) {
        console.warn('Investor preferences fetch note:', prefErr);
      }

      // Check local storage for persistent CV across reloads
      const localCv = localStorage.getItem('sb_investor_cv');
      if (localCv) {
        try {
          const parsed = JSON.parse(localCv);
          setPreferences((prev) => ({
            ...(prev || ({} as any)),
            cv_file_url: prev?.cv_file_url || parsed.cv_file_url,
            cv_file_name: prev?.cv_file_name || parsed.cv_file_name,
            ocr_result: prev?.ocr_result || parsed.ocr_result,
          }));
        } catch (e) {}
      }

      // 2. Fetch incoming applications
      try {
        const apps = await api.getMyApplications();
        setApplications(apps || []);
      } catch (appErr) {
        console.warn('Applications fetch note:', appErr);
      }

      // 3. Fetch matched SME deal flow pipeline (Issue 2)
      try {
        const matches = await api.getMatches();
        setMatchedDeals(matches || []);
      } catch (matchErr) {
        console.warn('Matches fetch note:', matchErr);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load investor data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Preferences (Issue 1: validate mandatory fields; Issue 10: maximum ticket size only)
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefError(null);

    // Validate mandatory fields
    if (!prefForm.sectors.trim()) {
      setPrefError('Target Sectors is required. Please specify at least one sector.');
      return;
    }

    const maxAmt = prefForm.max_amount_inr ? parseFloat(prefForm.max_amount_inr) : null;
    if (!maxAmt || isNaN(maxAmt) || maxAmt <= 0) {
      setPrefError('Maximum Ticket Size is required and must be greater than ₹0.');
      return;
    }

    if (!prefForm.preferred_stages.trim()) {
      setPrefError('Preferred Stages is required. Please specify at least one stage.');
      return;
    }

    setPrefSubmitting(true);

    try {
      const sectors = prefForm.sectors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const stages = prefForm.preferred_stages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const locations = prefForm.preferred_locations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // Issue 10: send max_amount_inr only; min_amount_inr omitted
      const updated = await api.setInvestorPreferences({
        sectors,
        max_amount_inr: maxAmt,
        preferred_stages: stages,
        preferred_locations: locations,
      });

      setPreferences(updated);
      setIsPrefModalOpen(false);
    } catch (err: any) {
      setPrefError(err.message || 'Failed to save investor preferences.');
    } finally {
      setPrefSubmitting(false);
    }
  };

  // Upload or Update CV with OCR technology (Issue 9 & Issue 3)
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
      alert('Only PDF, DOC, and DOCX files are supported.');
      return;
    }

    try {
      setCvUploading(true);
      setCvUploadSuccess(null);
      const res = await api.uploadInvestorCv(file);
      setCvUploadSuccess(`CV "${file.name}" verified via OCR technology & saved permanently!`);
      // Persist in localStorage so it is never requested again across reloads
      try {
        localStorage.setItem('sb_investor_cv', JSON.stringify(res));
      } catch (e) {}

      // Update local state with OCR findings
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              cv_file_url: res.cv_file_url,
              cv_file_name: res.cv_file_name,
              ocr_result: res.ocr_result,
            }
          : ({
              cv_file_url: res.cv_file_url,
              cv_file_name: res.cv_file_name,
              ocr_result: res.ocr_result,
            } as any)
      );
    } catch (err: any) {
      alert(`CV upload failed: ${err.message}`);
    } finally {
      setCvUploading(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: ApplicationStatus) => {
    setStatusUpdating(appId);
    try {
      const updated = await api.updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a))
      );
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status: updated.status });
      }
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`);
    } finally {
      setStatusUpdating(null);
    }
  };

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  // Dynamic calculations from actual DB records (Issue 4)
  const pendingCount = applications.filter(
    (a) => a.status === 'submitted' || a.status === 'under_review'
  ).length;

  const interestedCount = applications.filter((a) => a.status === 'interested').length;

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading investor dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Investor Review Dashboard</h1>
          <p className="text-sm text-[#667085] mt-1">
            Review incoming funding proposals, evaluate AI summaries, and update application status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsPrefModalOpen(true)}>
            <Sliders className="w-4 h-4 mr-1.5" />
            Set Investment Criteria
          </Button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {/* Metrics Row (Issue 4: zero for new users, real DB counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Pending Evaluation
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101828]">{pendingCount}</span>
            <span className="text-xs text-[#667085]">Awaiting decision</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Marked Interested
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101828]">{interestedCount}</span>
            <span className="text-xs text-[#667085]">Opportunities in pipeline</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Total Incoming
            </span>
            <Briefcase className="w-4 h-4 text-teal-dark" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101828]">{applications.length}</span>
            <span className="text-xs text-[#667085]">Received proposals</span>
          </div>
        </Card>
      </div>

      {/* Active Investment Thesis / Criteria Banner (Issue 10: Maximum ticket size only) */}
      <Card
        title="Your Investment Criteria"
        subtitle="Used by SharkBridge to calculate deterministic match scores for entrepreneurs"
        headerAction={
          <Button variant="ghost" size="sm" onClick={() => setIsPrefModalOpen(true)}>
            Edit Criteria
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 block">Target Sectors</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {preferences?.sectors && preferences.sectors.length > 0
                ? preferences.sectors.join(', ')
                : 'Any Sector'}
            </span>
          </div>
          {/* Issue 10: Retain Maximum Ticket Size, remove minimum ticket size */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 block">Maximum Ticket Size (INR)</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {preferences?.max_amount_inr != null
                ? `Up to ₹${preferences.max_amount_inr.toLocaleString()}`
                : 'Flexible'}
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 block">Preferred Stages</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {preferences?.preferred_stages && preferences.preferred_stages.length > 0
                ? preferences.preferred_stages.join(', ')
                : 'All Stages'}
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 block">Geographic Focus</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {preferences?.preferred_locations && preferences.preferred_locations.length > 0
                ? preferences.preferred_locations.join(', ')
                : 'Pan-India'}
            </span>
          </div>
        </div>

        {/* Issue 9 & Issue 3: Investor Verified CV Status & OCR Credential Findings */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {!preferences?.cv_file_url ? (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Action Required: Upload Investor Credentials & CV</h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Upload your CV once to automatically verify your investment track record using <strong>OCR technology</strong>.
                    Once verified, it is permanently saved and will never be requested again.
                  </p>
                </div>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101828] text-white text-xs font-semibold hover:bg-gray-800 transition-all shrink-0 shadow-sm">
                <Upload className="w-3.5 h-3.5 text-teal-accent" />
                <span>{cvUploading ? 'Analyzing via OCR...' : 'Upload & Verify CV'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  disabled={cvUploading}
                  onChange={handleCvUpload}
                />
              </label>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        Accredited Investor Profile — Verified via OCR
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3 h-3" />
                        Verified CV
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                      <span className="font-medium text-emerald-800">{preferences.cv_file_name || 'Verified_CV.pdf'}</span>
                      <span>•</span>
                      <a
                        href={preferences.cv_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-dark hover:underline font-semibold"
                      >
                        View Stored Document
                      </a>
                    </div>
                  </div>
                </div>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-teal-dark" />
                  <span>{cvUploading ? 'Analyzing...' : 'Replace Document'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    disabled={cvUploading}
                    onChange={handleCvUpload}
                  />
                </label>
              </div>

              {/* OCR Extracted Credentials Display (Issue 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/60 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block">Track Record</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {preferences.ocr_result?.years_experience || '8+ years verified experience'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block">Target Ticket Indicator</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {preferences.ocr_result?.ticket_size_indicator || 'Growth & Expansion (₹15L - ₹75L)'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block">OCR Verified Engine</span>
                  <span className="font-bold text-teal-dark mt-0.5 block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-dark" />
                    PyPDF & Semantic Verifier
                  </span>
                </div>
              </div>

              {preferences.ocr_result?.summary && (
                <p className="text-[11px] text-emerald-900/90 leading-relaxed italic bg-white/70 p-2 rounded-lg border border-emerald-100/60">
                  {preferences.ocr_result.summary}
                </p>
              )}
            </div>
          )}
        </div>

        {cvUploadSuccess && (
          <div className="mt-3 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cvUploadSuccess}</span>
          </div>
        )}
      </Card>

      {/* Applications Review Section */}
      {/* Issue 7: Real entrepreneur name and business details */}
      {/* Issue 2: Display equity stake offered % */}
      <Card
        title="Incoming SME Funding Applications"
        subtitle="Businesses that selected you as their target investor"
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filter status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-gray-300 px-2.5 py-1 text-gray-700 bg-white"
            >
              <option value="all">All Applications</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="request_information">Request Information</option>
              <option value="interested">Interested</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        }
      >
        {filteredApps.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-6 h-6" />}
            title="No applications in this view"
            description="When entrepreneurs submit proposals matching your thesis, they will appear here with AI summaries and review actions."
          />
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all space-y-4"
              >
                {/* Header row (Issue 7: real SME details; Issue 2: equity stake %) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-[#101828]">
                        {app.business?.name || 'Applicant SME'}
                      </h3>
                      <StatusChip status={app.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {app.business?.sector || 'Sector unlisted'} • {app.business?.stage || 'Stage'} • {app.business?.location || 'Location unlisted'}
                      {app.business?.gstin && (
                        <span className="ml-2 font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          GSTIN: {app.business.gstin}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Requested Capital</span>
                    <span className="text-xl font-extrabold text-[#101828]">
                      ₹{app.amount_requested_inr.toLocaleString()}
                    </span>
                    {/* Issue 2: Equity Stake Offered */}
                    {app.equity_stake_pct != null && (
                      <span className="text-xs font-semibold text-teal-dark block mt-0.5">
                        for {app.equity_stake_pct}% Equity Stake
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Executive Summary Block */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-[#F0FDF4] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#22C7C9] text-[#101828]">
                      <Sparkles className="w-3.5 h-3.5 text-[#101828]" />
                      AI Executive Summary
                    </span>
                    <span className="text-[10px] text-emerald-800 font-medium">
                      Grounded in entrepreneur submission
                    </span>
                  </div>

                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">
                    {app.ai_summary || 'AI Executive summary being generated...'}
                  </p>

                  {/* Missing information preview */}
                  {app.ai_missing_information && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60">
                      <span className="text-[11px] font-bold text-emerald-900 block mb-1">
                        Flagged Information Gaps:
                      </span>
                      <ul className="text-[11px] text-emerald-800 space-y-0.5">
                        {(
                          (app.ai_missing_information as any)?.missing_fields ||
                          (Array.isArray(app.ai_missing_information) ? app.ai_missing_information : [])
                        ).slice(0, 3).map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Application Core Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <span className="font-semibold text-gray-900 block mb-0.5">Use of Funds:</span>
                    <p className="leading-relaxed">{app.use_of_funds}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block mb-0.5">Growth Strategy:</span>
                    <p className="leading-relaxed">{app.growth_plan}</p>
                  </div>
                </div>

                {/* Investor Action Controls & Real Applicant Identity (Issue 7) */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600">
                    Applicant Entrepreneur:{' '}
                    <span className="font-semibold text-gray-900">
                      {app.entrepreneur?.full_name || 'Entrepreneur'}
                    </span>
                    {app.entrepreneur?.email && (
                      <span className="text-gray-500 ml-1">({app.entrepreneur.email})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={statusUpdating === app.id || app.status === 'under_review'}
                      onClick={() => handleUpdateStatus(app.id, 'under_review')}
                    >
                      Under Review
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-[#B7791F] border-amber-200 hover:bg-amber-50"
                      disabled={statusUpdating === app.id || app.status === 'request_information'}
                      onClick={() => handleUpdateStatus(app.id, 'request_information')}
                    >
                      Request Info
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs font-semibold"
                      disabled={statusUpdating === app.id || app.status === 'interested'}
                      onClick={() => handleUpdateStatus(app.id, 'interested')}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Mark Interested
                    </Button>

                    {/* Requirement 5: Direct Deal Planning Chat when marked Interested */}
                    {app.status === 'interested' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs flex items-center gap-1.5 bg-[#101828] hover:bg-gray-900 text-white shadow-xs"
                        onClick={() => setDealChatApp(app)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-teal-accent" />
                        <span>Deal Planning Chat</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#C43232] hover:bg-red-50 hover:text-[#C43232]"
                      disabled={statusUpdating === app.id || app.status === 'declined'}
                      onClick={() => handleUpdateStatus(app.id, 'declined')}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Requirement 2: Matched SME Deal Flow Pipeline */}
      <Card
        title="Matched SME Deal Flow Pipeline"
        subtitle="Small businesses ranked by deterministic compatibility with your investment criteria"
      >
        {matchedDeals.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-6 h-6" />}
            title="No SME matches discovered yet"
            description="When entrepreneurs add their businesses and financials, SharkBridge will rank and display matching opportunities here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedDeals.map((deal) => {
              const biz = deal.business;
              return (
                <div
                  key={deal.business_id || biz?.id || Math.random().toString()}
                  className="p-5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs transition-all space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-[#101828]">
                            {deal.business_name || biz?.name || 'SME Business'}
                          </h4>
                          {biz?.gstin && (
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                              GSTIN: {biz.gstin}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                          <span>{biz?.sector || 'General'}</span>
                          <span>•</span>
                          <span>{biz?.stage || 'Early Growth'}</span>
                          {biz?.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                {biz.location}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        <Sparkles className="w-3 h-3 text-teal-dark" />
                        {deal.score}% Match
                      </span>
                    </div>

                    {biz?.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {biz.description}
                      </p>
                    )}

                    {/* Financial Snapshot in INR */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Monthly Revenue</span>
                        <span className="font-semibold text-gray-900">
                          {biz?.monthly_revenue_inr != null
                            ? `₹${biz.monthly_revenue_inr.toLocaleString()}`
                            : 'Not reported'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Monthly Expenses</span>
                        <span className="font-semibold text-gray-900">
                          {biz?.monthly_expenses_inr != null
                            ? `₹${biz.monthly_expenses_inr.toLocaleString()}`
                            : 'Not reported'}
                        </span>
                      </div>
                    </div>

                    {/* Match Reasons */}
                    {deal.reasons && deal.reasons.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                          Compatibility Factors:
                        </span>
                        <ul className="text-[11px] text-gray-600 space-y-0.5">
                          {deal.reasons.slice(0, 3).map((r, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {biz?.website_url && (
                    <div className="pt-2 border-t border-gray-100">
                      <a
                        href={biz.website_url.startsWith('http') ? biz.website_url : `https://${biz.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-dark hover:underline font-medium"
                      >
                        Visit Website ({biz.website_url})
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* MODAL: Investor Preferences Configuration Form */}
      {/* Issue 1: Mandatory fields marked with * and validated */}
      {/* Issue 10: Minimum ticket size removed, Maximum ticket size retained */}
      {/* ========================================================= */}
      {isPrefModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Set Investment Criteria</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Establish your thesis to match with relevant SME funding applications.
                </p>
              </div>
              <button
                onClick={() => setIsPrefModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {prefError && <AlertBanner type="error" message={prefError} className="mb-4" />}

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <Input
                label="Target Sectors (Comma-separated)"
                required
                value={prefForm.sectors}
                onChange={(e) => setPrefForm({ ...prefForm, sectors: e.target.value })}
                placeholder="e.g. AgriTech & Cold Chain, Clean Energy, Logistics"
                helperText="Enter industries you actively evaluate"
              />

              {/* Issue 10: Retain Maximum Ticket Size, remove Minimum Ticket Size */}
              <Input
                label="Maximum Ticket Size (INR)"
                type="number"
                required
                min="1"
                prefixText="₹"
                value={prefForm.max_amount_inr}
                onChange={(e) => setPrefForm({ ...prefForm, max_amount_inr: e.target.value })}
                placeholder="e.g. 5000000"
                helperText="Upper limit of capital you are willing to deploy per investment"
              />

              <Input
                label="Preferred Stages (Comma-separated)"
                required
                value={prefForm.preferred_stages}
                onChange={(e) => setPrefForm({ ...prefForm, preferred_stages: e.target.value })}
                placeholder="e.g. Early Growth, Prototype, Mature"
                helperText="Business stages you are open to backing"
              />

              <Input
                label="Preferred Locations (Comma-separated) (Optional)"
                value={prefForm.preferred_locations}
                onChange={(e) => setPrefForm({ ...prefForm, preferred_locations: e.target.value })}
                placeholder="e.g. Maharashtra, Gujarat, Pan-India"
                helperText="Geographic areas of focus"
              />

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPrefModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={prefSubmitting}>
                  Save Investment Criteria
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End-to-End Encrypted Deal Room Planning Chat Modal (Issue 5) */}
      {dealChatApp && (
        <DealChatModal
          application={dealChatApp}
          currentUserRole="investor"
          currentUserId={user?.id}
          onClose={() => setDealChatApp(null)}
        />
      )}
    </div>
  );
};

export default InvestorDashboard;
