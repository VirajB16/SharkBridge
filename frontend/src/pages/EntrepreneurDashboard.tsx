import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  ArrowUpRight,
  FileText,
  Sparkles,
  Edit3,
  X,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { EmptyState } from '../components/common/EmptyState';
import { AlertBanner } from '../components/common/AlertBanner';
import { Input } from '../components/common/Input';
import { Textarea } from '../components/common/Textarea';
import { Select } from '../components/common/Select';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { api } from '../lib/api';
import { Business, FundingApplication, MatchResult } from '../types';

interface EntrepreneurDashboardProps {
  user?: any;
}

export const EntrepreneurDashboard: React.FC<EntrepreneurDashboardProps> = () => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [applications, setApplications] = useState<FundingApplication[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<FundingApplication | null>(null);
  const [preselectedInvestorId, setPreselectedInvestorId] = useState<string>('');

  // Business Form State
  const [bizForm, setBizForm] = useState({
    name: '',
    sector: '',
    description: '',
    stage: 'Early Growth',
    location: '',
    target_customers: '',
    monthly_revenue_inr: '',
    monthly_expenses_inr: '',
    growth_plan: '',
    website_url: '',
  });
  const [bizSubmitting, setBizSubmitting] = useState(false);
  const [bizFormError, setBizFormError] = useState<string | null>(null);

  // Application Form State
  const [appForm, setAppForm] = useState({
    investor_id: '',
    amount_requested_inr: '',
    use_of_funds: '',
    growth_plan: '',
    additional_notes: '',
    confirmation: false,
  });
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [appFormError, setAppFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch own businesses
      const bizList = await api.getMyBusinesses();
      if (bizList && bizList.length > 0) {
        setBusiness(bizList[0]);
        setBizForm({
          name: bizList[0].name || '',
          sector: bizList[0].sector || '',
          description: bizList[0].description || '',
          stage: bizList[0].stage || 'Early Growth',
          location: bizList[0].location || '',
          target_customers: bizList[0].target_customers || '',
          monthly_revenue_inr: bizList[0].monthly_revenue_inr?.toString() || '',
          monthly_expenses_inr: bizList[0].monthly_expenses_inr?.toString() || '',
          growth_plan: bizList[0].growth_plan || '',
          website_url: bizList[0].website_url || '',
        });
      }

      // 2. Fetch applications
      const apps = await api.getMyApplications();
      setApplications(apps || []);

      // 3. Fetch matched investors
      const matchResults = await api.getMatches();
      setMatches(matchResults || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save or Update Business
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBizFormError(null);
    setBizSubmitting(true);

    try {
      const payload: Partial<Business> = {
        name: bizForm.name,
        sector: bizForm.sector,
        description: bizForm.description,
        stage: bizForm.stage,
        location: bizForm.location || null,
        target_customers: bizForm.target_customers || null,
        monthly_revenue_inr: bizForm.monthly_revenue_inr ? parseFloat(bizForm.monthly_revenue_inr) : null,
        monthly_expenses_inr: bizForm.monthly_expenses_inr ? parseFloat(bizForm.monthly_expenses_inr) : null,
        growth_plan: bizForm.growth_plan || null,
        website_url: bizForm.website_url || null,
      };

      if (business) {
        const updated = await api.updateBusiness(business.id, payload);
        setBusiness(updated);
      } else {
        const created = await api.createBusiness(payload);
        setBusiness(created);
      }

      setIsBizModalOpen(false);
      loadData(); // refresh matches based on updated profile
    } catch (err: any) {
      setBizFormError(err.message || 'Failed to save business profile.');
    } finally {
      setBizSubmitting(false);
    }
  };

  // Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppFormError(null);

    if (!business) {
      setAppFormError('Please complete your business profile before applying for funding.');
      return;
    }
    if (!appForm.investor_id) {
      setAppFormError('Please select a target investor.');
      return;
    }
    if (!appForm.confirmation) {
      setAppFormError('You must confirm that submitted information is accurate.');
      return;
    }

    setAppSubmitting(true);
    try {
      const amt = parseFloat(appForm.amount_requested_inr);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid funding amount greater than ₹0.');
      }

      const newApp = await api.submitApplication({
        business_id: business.id,
        investor_id: appForm.investor_id,
        amount_requested_inr: amt,
        use_of_funds: appForm.use_of_funds,
        growth_plan: appForm.growth_plan,
        additional_notes: appForm.additional_notes || undefined,
        confirmation: true,
      });

      setApplications([newApp, ...applications]);
      setIsApplyModalOpen(false);
      setSelectedApp(newApp); // Open detail preview with AI summary immediately
      setAppForm({
        investor_id: '',
        amount_requested_inr: '',
        use_of_funds: '',
        growth_plan: '',
        additional_notes: '',
        confirmation: false,
      });
    } catch (err: any) {
      setAppFormError(err.message || 'Failed to submit application.');
    } finally {
      setAppSubmitting(false);
    }
  };

  const openApplyForInvestor = (investorId: string) => {
    setPreselectedInvestorId(investorId);
    setAppForm((prev) => ({ ...prev, investor_id: investorId }));
    setIsApplyModalOpen(true);
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading entrepreneur dashboard..." />;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Entrepreneur Dashboard</h1>
          <p className="text-sm text-[#667085] mt-1">
            Build your business profile, discover matched investors, and track application reviews.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsBizModalOpen(true)}>
            <Building2 className="w-4 h-4 mr-1.5" />
            {business ? 'Edit Business Profile' : 'Create Business Profile'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!business) {
                setIsBizModalOpen(true);
              } else {
                setIsApplyModalOpen(true);
              }
            }}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Apply for Funding
          </Button>
        </div>
      </div>

      {error && <AlertBanner type="error" message={error} />}

      {/* AI Notice Banner */}
      <AlertBanner
        type="ai"
        message={
          <span>
            <strong>AI Assistant Active:</strong> SharkBridge structures your data and creates an executive summary for investors. AI outputs are strictly grounded on submitted data and do not constitute financial advice.
          </span>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Business Profile
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                business ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#101828]">
              {business ? business.name : 'Not Created'}
            </span>
            <span className="text-xs text-[#667085]">
              {business ? business.stage : 'Click to create'}
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Active Applications
            </span>
            <FileText className="w-4 h-4 text-[#667085]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101828]">{applications.length}</span>
            <span className="text-xs text-[#667085]">Funding submissions</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              Matched Investors
            </span>
            <ArrowUpRight className="w-4 h-4 text-teal-dark" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101828]">{matches.length}</span>
            <span className="text-xs text-[#667085]">Calculated from thesis</span>
          </div>
        </Card>
      </div>

      {/* Business Details Card (if created) */}
      {business ? (
        <Card
          title={business.name}
          subtitle={`${business.sector} • ${business.stage} • ${business.location || 'Location unlisted'}`}
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => setIsBizModalOpen(true)}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Business Description</h4>
              <p className="text-gray-600 leading-relaxed mb-4">{business.description}</p>

              {business.target_customers && (
                <>
                  <h4 className="font-semibold text-gray-900 mb-1">Target Customers</h4>
                  <p className="text-gray-600 leading-relaxed mb-4">{business.target_customers}</p>
                </>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Self-Reported Financials (INR)</h4>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Monthly Revenue</span>
                  <span className="text-base font-semibold text-gray-900">
                    {business.monthly_revenue_inr != null
                      ? `₹${business.monthly_revenue_inr.toLocaleString()}`
                      : 'Not provided'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Monthly Expenses</span>
                  <span className="text-base font-semibold text-gray-900">
                    {business.monthly_expenses_inr != null
                      ? `₹${business.monthly_expenses_inr.toLocaleString()}`
                      : 'Not provided'}
                  </span>
                </div>
              </div>

              {business.growth_plan && (
                <>
                  <h4 className="font-semibold text-gray-900 mb-1">Growth & Expansion Plan</h4>
                  <p className="text-gray-600 leading-relaxed">{business.growth_plan}</p>
                </>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Building2 className="w-6 h-6" />}
            title="Complete your business profile"
            description="Enter your business details, stage, and revenue figures in INR so investors can evaluate your funding fit."
            actionLabel="Create Business Profile"
            onAction={() => setIsBizModalOpen(true)}
          />
        </Card>
      )}

      {/* Matched Investors Discovery Section */}
      <Card
        title="Investor Matches"
        subtitle="Transparent recommendations scored by sector fit, ticket size, stage, and location"
      >
        {matches.length === 0 ? (
          <EmptyState
            icon={<ArrowUpRight className="w-6 h-6" />}
            title="No investor matches found yet"
            description={
              business
                ? 'No registered investors currently match your sector or stage. We are constantly expanding investor participation.'
                : 'Complete your business profile to calculate deterministic match scores.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m, idx) => (
              <div
                key={m.investor_id || idx}
                className="p-5 rounded-xl border border-gray-200 bg-white hover:border-teal-dark transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-base text-[#101828]">
                      {m.investor_name || 'Verified Investor'}
                    </h4>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.score >= 70
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.score >= 40
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {m.score}/100 Match
                    </span>
                  </div>

                  {m.preferences && (
                    <div className="text-xs text-gray-600 space-y-1 mb-3">
                      <div>
                        <strong>Target Sectors:</strong>{' '}
                        {m.preferences.sectors?.join(', ') || 'General'}
                      </div>
                      <div>
                        <strong>Ticket Range:</strong>{' '}
                        {m.preferences.min_amount_inr != null && m.preferences.max_amount_inr != null
                          ? `₹${m.preferences.min_amount_inr.toLocaleString()} - ₹${m.preferences.max_amount_inr.toLocaleString()}`
                          : 'Flexible'}
                      </div>
                      <div>
                        <strong>Preferred Stages:</strong>{' '}
                        {m.preferences.preferred_stages?.join(', ') || 'Any'}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1.5 mb-4 border border-gray-100">
                    <span className="font-semibold text-gray-800 block">Match Explanation:</span>
                    {m.reasons.map((r, rIdx) => (
                      <p key={rIdx} className="text-gray-600 flex items-start gap-1.5">
                        <span className="text-teal-dark font-bold">•</span>
                        <span>{r}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => openApplyForInvestor(m.investor_id || '')}
                >
                  Apply to this Investor
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Applications List */}
      <Card
        title="Submitted Applications"
        subtitle="Track application progress and review status updated by investors"
      >
        {applications.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No funding applications submitted"
            description="Select an investor match above to submit your first funding request with AI executive summary."
            actionLabel="Apply for Funding"
            onAction={() => setIsApplyModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Target Investor</th>
                  <th className="px-4 py-3">Requested (INR)</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {app.business?.name || business?.name || 'My Business'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {app.investor?.full_name || 'Apex Ventures'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      ₹{app.amount_requested_inr.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedApp(app)}
                      >
                        View AI Summary
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* MODAL 1: Business Profile Form */}
      {/* ========================================================= */}
      {isBizModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {business ? 'Edit Business Profile' : 'Create Business Profile'}
              </h3>
              <button
                onClick={() => setIsBizModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bizFormError && <AlertBanner type="error" message={bizFormError} className="mb-4" />}

            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business Name"
                  required
                  value={bizForm.name}
                  onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                  placeholder="e.g. KisanFresh Logistics"
                />
                <Input
                  label="Sector / Industry"
                  required
                  value={bizForm.sector}
                  onChange={(e) => setBizForm({ ...bizForm, sector: e.target.value })}
                  placeholder="e.g. AgriTech & Cold Chain"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Business Stage"
                  required
                  value={bizForm.stage}
                  onChange={(e) => setBizForm({ ...bizForm, stage: e.target.value })}
                  options={[
                    { value: 'Idea', label: 'Idea / Concept' },
                    { value: 'Prototype', label: 'Prototype / Pre-launch' },
                    { value: 'Early Growth', label: 'Early Growth (Generating Sales)' },
                    { value: 'Scaling', label: 'Scaling' },
                    { value: 'Mature', label: 'Mature / Established' },
                  ]}
                />
                <Input
                  label="Operating Location"
                  value={bizForm.location}
                  onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })}
                  placeholder="e.g. Pune, Maharashtra"
                />
              </div>

              <Textarea
                label="Short Description"
                required
                rows={3}
                value={bizForm.description}
                onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })}
                placeholder="What does your business do, and what problem does it solve?"
              />

              <Input
                label="Target Customers"
                value={bizForm.target_customers}
                onChange={(e) => setBizForm({ ...bizForm, target_customers: e.target.value })}
                placeholder="e.g. Perishable crop farmers and urban grocery chains"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Monthly Revenue (INR)"
                  type="number"
                  min="0"
                  prefixText="₹"
                  value={bizForm.monthly_revenue_inr}
                  onChange={(e) => setBizForm({ ...bizForm, monthly_revenue_inr: e.target.value })}
                  placeholder="e.g. 450000"
                  helperText="Optional; leave blank if pre-revenue"
                />
                <Input
                  label="Monthly Expenses (INR)"
                  type="number"
                  min="0"
                  prefixText="₹"
                  value={bizForm.monthly_expenses_inr}
                  onChange={(e) => setBizForm({ ...bizForm, monthly_expenses_inr: e.target.value })}
                  placeholder="e.g. 380000"
                  helperText="Optional"
                />
              </div>

              <Textarea
                label="Growth Plan & Milestones"
                rows={3}
                value={bizForm.growth_plan}
                onChange={(e) => setBizForm({ ...bizForm, growth_plan: e.target.value })}
                placeholder="How do you plan to scale operations over the next 12-24 months?"
              />

              <Input
                label="Website or Social Link (Optional)"
                type="url"
                value={bizForm.website_url}
                onChange={(e) => setBizForm({ ...bizForm, website_url: e.target.value })}
                placeholder="https://example.com"
              />

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBizModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={bizSubmitting}>
                  Save Business Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: New Funding Application Form */}
      {/* ========================================================= */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Submit Funding Application</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your submitted details will be synthesized by server-side AI for investor review.
                </p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {appFormError && <AlertBanner type="error" message={appFormError} className="mb-4" />}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <Select
                label="Target Investor"
                required
                value={appForm.investor_id || preselectedInvestorId}
                onChange={(e) => setAppForm({ ...appForm, investor_id: e.target.value })}
                placeholder="-- Select an Investor --"
                options={matches.map((m) => ({
                  value: m.investor_id || '',
                  label: `${m.investor_name || 'Investor'} (${m.score}% match)`,
                }))}
              />

              <Input
                label="Funding Amount Requested (INR)"
                type="number"
                required
                min="1"
                prefixText="₹"
                value={appForm.amount_requested_inr}
                onChange={(e) => setAppForm({ ...appForm, amount_requested_inr: e.target.value })}
                placeholder="e.g. 2500000"
                helperText="Specify total capital required in INR"
              />

              <Textarea
                label="Intended Use of Funds"
                required
                rows={3}
                value={appForm.use_of_funds}
                onChange={(e) => setAppForm({ ...appForm, use_of_funds: e.target.value })}
                placeholder="e.g. Capital will be allocated to acquiring 2 refrigerated transport vehicles (60%) and leasing regional farm depots (40%)."
              />

              <Textarea
                label="Growth Plan & Key Milestones"
                required
                rows={3}
                value={appForm.growth_plan}
                onChange={(e) => setAppForm({ ...appForm, growth_plan: e.target.value })}
                placeholder="e.g. Reach 80 tons monthly distribution throughput within 9 months of capital deployment."
              />

              <Textarea
                label="Additional Notes (Optional)"
                rows={2}
                value={appForm.additional_notes}
                onChange={(e) => setAppForm({ ...appForm, additional_notes: e.target.value })}
                placeholder="Any existing contracts, letters of intent, or certifications?"
              />

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={appForm.confirmation}
                    onChange={(e) => setAppForm({ ...appForm, confirmation: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded text-[#101828] border-gray-300 focus:ring-[#101828]"
                  />
                  <span className="text-xs text-gray-700 leading-normal">
                    I confirm that the submitted business and financial information is accurate to the best of my knowledge. I understand that AI summaries are informational and do not guarantee funding.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={appSubmitting}>
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Application Detail & AI Summary Inspection */}
      {/* ========================================================= */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Application Details</h3>
                  <StatusChip status={selectedApp.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Submitted to {selectedApp.investor?.full_name || 'Target Investor'}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Executive Summary Panel */}
            <div className="p-5 rounded-xl border border-teal-dark/30 bg-[#F0FDF4] space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-[#22C7C9] text-[#101828]">
                  <Sparkles className="w-3.5 h-3.5 text-[#101828]" />
                  AI Executive Summary
                </span>
                <span className="text-[11px] text-gray-500">
                  Grounded strictly on submitted facts
                </span>
              </div>

              <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {selectedApp.ai_summary || 'AI Summary generating...'}
              </div>

              {/* Missing Information Flags */}
              {selectedApp.ai_missing_information && (
                <div className="mt-4 pt-3 border-t border-emerald-200">
                  <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                    Missing Information Flags Identified by AI:
                  </h5>
                  <ul className="text-xs text-emerald-800 space-y-1">
                    {(
                      (selectedApp.ai_missing_information as any)?.missing_fields ||
                      (Array.isArray(selectedApp.ai_missing_information) ? selectedApp.ai_missing_information : [])
                    ).map((m: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-gray-500 pt-2 border-t border-emerald-100 italic">
                Disclaimer: AI summaries are generated to assist discovery. They do not constitute investment advice or endorsement.
              </p>
            </div>

            {/* Application Data Details */}
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-xs text-gray-500 block">Requested Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{selectedApp.amount_requested_inr.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Current Status</span>
                  <div className="mt-1">
                    <StatusChip status={selectedApp.status} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Use of Funds</h4>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg text-xs sm:text-sm">
                  {selectedApp.use_of_funds}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Growth & Milestone Plan</h4>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg text-xs sm:text-sm">
                  {selectedApp.growth_plan}
                </p>
              </div>

              {selectedApp.additional_notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Additional Notes</h4>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg text-xs sm:text-sm">
                    {selectedApp.additional_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
