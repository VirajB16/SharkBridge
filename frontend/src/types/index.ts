export type UserRole = 'entrepreneur' | 'investor';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'request_information'
  | 'interested'
  | 'declined'
  | 'closed';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  sector: string;
  description: string;
  stage: string;
  location?: string | null;
  target_customers?: string | null;
  monthly_revenue_inr?: number | null;
  monthly_expenses_inr?: number | null;
  growth_plan?: string | null;
  website_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorPreferences {
  id: string;
  investor_id: string;
  sectors: string[];
  min_amount_inr?: number | null;
  max_amount_inr?: number | null;
  preferred_stages: string[];
  preferred_locations?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface FundingApplication {
  id: string;
  business_id: string;
  entrepreneur_id: string;
  investor_id: string;
  amount_requested_inr: number;
  use_of_funds: string;
  growth_plan: string;
  additional_notes?: string | null;
  ai_summary?: string | null;
  ai_missing_information?: string[] | { missing_fields?: string[]; questions?: string[] } | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  // Joins/expansions for display
  business?: Business;
  entrepreneur?: Profile;
  investor?: Profile;
}

export interface MatchResult {
  investor_id?: string;
  business_id?: string;
  score: number;
  reasons: string[];
  investor_name?: string;
  business_name?: string;
  sectors?: string[];
  min_amount_inr?: number | null;
  max_amount_inr?: number | null;
  preferred_stages?: string[];
  location?: string | null;
  preferences?: InvestorPreferences | null;
}

export interface HealthStatus {
  status: string;
  version: string;
  service: string;
  environment_configured: {
    supabase_url: boolean;
    supabase_anon_key: boolean;
    supabase_service_role_key: boolean;
    llm_api_key: boolean;
  };
}

