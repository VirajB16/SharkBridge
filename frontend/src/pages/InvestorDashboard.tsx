import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Briefcase,
  CheckCircle,
  Clock,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { EmptyState } from '../components/common/EmptyState';
import { AlertBanner } from '../components/common/AlertBanner';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { api } from '../lib/api';
import { InvestorPreferences, FundingApplication, ApplicationStatus } from '../types';

interface InvestorDashboardProps {
  user?: any;
}

export const InvestorDashboard: React.FC<InvestorDashboardProps> = () => {
  const [preferences, setPreferences] = useState<InvestorPreferences | null>(null);
  const [applications, setApplications] = useState<FundingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Selection
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<FundingApplication | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Preference Form State
  const [prefForm, setPrefForm] = useState({
    sectors: '',
    min_amount_inr: '',
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

      // 1. Fetch preferences
      const prefs = await api.getInvestorPreferences();
      if (prefs) {
        setPreferences(prefs);
        setPrefForm({
          sectors: prefs.sectors ? prefs.sectors.join(', ') : '',
          min_amount_inr: prefs.min_amount_inr ? prefs.min_amount_inr.toString() : '',
          max_amount_inr: prefs.max_amount_inr ? prefs.max_amount_inr.toString() : '',
          preferred_stages: prefs.preferred_stages ? prefs.preferred_stages.join(', ') : '',
          preferred_locations: prefs.preferred_locations ? prefs.preferred_locations.join(', ') : '',
        });
      }

      // 2. Fetch incoming applications
      const apps = await api.getMyApplications();
      setApplications(apps || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load investor data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefError(null);
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

      const minAmt = prefForm.min_amount_inr ? parseFloat(prefForm.min_amount_inr) : null;
      const maxAmt = prefForm.max_amount_inr ? parseFloat(prefForm.max_amount_inr) : null;

      if (minAmt != null && maxAmt != null && minAmt > maxAmt) {
        throw new Error('Minimum ticket size cannot exceed maximum ticket size.');
      }

      const updated = await api.setInvestorPreferences({
        sectors,
        min_amount_inr: minAmt,
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

      {/* Metrics Row */}
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

      {/* Active Investment Thesis / Criteria Banner */}
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
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 block">Ticket Size Range (INR)</span>
            <span className="font-semibold text-gray-900 mt-0.5 block">
              {preferences?.min_amount_inr != null && preferences?.max_amount_inr != null
                ? `₹${preferences.min_amount_inr.toLocaleString()} - ₹${preferences.max_amount_inr.toLocaleString()}`
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
      </Card>

      {/* Applications Review Section */}
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
                {/* Header row */}
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
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Requested Capital</span>
                    <span className="text-xl font-extrabold text-[#101828]">
                      ₹{app.amount_requested_inr.toLocaleString()}
                    </span>
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

                {/* Investor Action Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Applicant:{' '}
                    <span className="font-medium text-gray-800">
                      {app.entrepreneur?.full_name || 'Entrepreneur'}
                    </span>{' '}
                    ({app.entrepreneur?.email || 'email on file'})
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

      {/* ========================================================= */}
      {/* MODAL: Investor Preferences Configuration Form */}
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
                value={prefForm.sectors}
                onChange={(e) => setPrefForm({ ...prefForm, sectors: e.target.value })}
                placeholder="e.g. AgriTech & Cold Chain, Clean Energy, Logistics"
                helperText="Enter industries you actively evaluate"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Minimum Ticket Size (INR)"
                  type="number"
                  min="0"
                  prefixText="₹"
                  value={prefForm.min_amount_inr}
                  onChange={(e) => setPrefForm({ ...prefForm, min_amount_inr: e.target.value })}
                  placeholder="e.g. 1000000"
                />
                <Input
                  label="Maximum Ticket Size (INR)"
                  type="number"
                  min="0"
                  prefixText="₹"
                  value={prefForm.max_amount_inr}
                  onChange={(e) => setPrefForm({ ...prefForm, max_amount_inr: e.target.value })}
                  placeholder="e.g. 5000000"
                />
              </div>

              <Input
                label="Preferred Stages (Comma-separated)"
                value={prefForm.preferred_stages}
                onChange={(e) => setPrefForm({ ...prefForm, preferred_stages: e.target.value })}
                placeholder="e.g. Early Growth, Seed, Prototype"
                helperText="Stages you are open to backing"
              />

              <Input
                label="Preferred Locations (Comma-separated)"
                value={prefForm.preferred_locations}
                onChange={(e) => setPrefForm({ ...prefForm, preferred_locations: e.target.value })}
                placeholder="e.g. Maharashtra, Gujarat, Pan-India"
                helperText="Geographic areas of focus (optional)"
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
    </div>
  );
};
