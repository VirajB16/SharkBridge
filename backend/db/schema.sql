-- ==============================================================================
-- SharkBridge Database Schema (PostgreSQL / Supabase)
-- Source of Truth: 04_DATA_MODEL.md & 01_PRD.md
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('entrepreneur', 'investor')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Businesses Table (Entrepreneurs)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    description TEXT NOT NULL,
    stage TEXT NOT NULL,
    location TEXT,
    target_customers TEXT,
    monthly_revenue_inr NUMERIC CHECK (monthly_revenue_inr IS NULL OR monthly_revenue_inr >= 0),
    monthly_expenses_inr NUMERIC CHECK (monthly_expenses_inr IS NULL OR monthly_expenses_inr >= 0),
    growth_plan TEXT,
    website_url TEXT,
    gstin TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Investor Preferences Table (Investors)
CREATE TABLE IF NOT EXISTS public.investor_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    min_amount_inr NUMERIC CHECK (min_amount_inr IS NULL OR min_amount_inr >= 0),
    max_amount_inr NUMERIC CHECK (max_amount_inr IS NULL OR max_amount_inr >= 0),
    preferred_stages TEXT[] NOT NULL DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    cv_file_url TEXT,
    cv_file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Funding Applications Table
CREATE TABLE IF NOT EXISTS public.funding_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    entrepreneur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_requested_inr NUMERIC NOT NULL CHECK (amount_requested_inr > 0),
    equity_stake_pct NUMERIC CHECK (equity_stake_pct IS NULL OR (equity_stake_pct >= 0 AND equity_stake_pct <= 100)),
    use_of_funds TEXT NOT NULL,
    growth_plan TEXT NOT NULL,
    additional_notes TEXT,
    ai_summary TEXT,
    ai_missing_information JSONB,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (
        status IN ('submitted', 'under_review', 'request_information', 'interested', 'declined', 'closed')
    ),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Indexes for Performance and Foreign Keys
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_sector ON public.businesses(sector);
CREATE INDEX IF NOT EXISTS idx_investor_prefs_investor ON public.investor_preferences(investor_id);
CREATE INDEX IF NOT EXISTS idx_applications_entrepreneur ON public.funding_applications(entrepreneur_id);
CREATE INDEX IF NOT EXISTS idx_applications_investor ON public.funding_applications(investor_id);
CREATE INDEX IF NOT EXISTS idx_applications_business ON public.funding_applications(business_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.funding_applications(status);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_applications ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Businesses Policies
DROP POLICY IF EXISTS "Businesses viewable by authenticated users" ON public.businesses;
CREATE POLICY "Businesses viewable by authenticated users"
ON public.businesses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Entrepreneurs can insert own business" ON public.businesses;
CREATE POLICY "Entrepreneurs can insert own business"
ON public.businesses FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Entrepreneurs can update own business" ON public.businesses;
CREATE POLICY "Entrepreneurs can update own business"
ON public.businesses FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Entrepreneurs can delete own business" ON public.businesses;
CREATE POLICY "Entrepreneurs can delete own business"
ON public.businesses FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Investor Preferences Policies
DROP POLICY IF EXISTS "Investor preferences viewable by authenticated users" ON public.investor_preferences;
CREATE POLICY "Investor preferences viewable by authenticated users"
ON public.investor_preferences FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Investors can insert own preferences" ON public.investor_preferences;
CREATE POLICY "Investors can insert own preferences"
ON public.investor_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = investor_id);

DROP POLICY IF EXISTS "Investors can update own preferences" ON public.investor_preferences;
CREATE POLICY "Investors can update own preferences"
ON public.investor_preferences FOR UPDATE TO authenticated USING (auth.uid() = investor_id);

-- Funding Applications Policies
DROP POLICY IF EXISTS "Only entrepreneur and target investor can view application" ON public.funding_applications;
CREATE POLICY "Only entrepreneur and target investor can view application"
ON public.funding_applications FOR SELECT TO authenticated
USING (auth.uid() = entrepreneur_id OR auth.uid() = investor_id);

DROP POLICY IF EXISTS "Entrepreneurs can submit application" ON public.funding_applications;
CREATE POLICY "Entrepreneurs can submit application"
ON public.funding_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = entrepreneur_id);

DROP POLICY IF EXISTS "Target investor can update application status" ON public.funding_applications;
CREATE POLICY "Target investor can update application status"
ON public.funding_applications FOR UPDATE TO authenticated
USING (auth.uid() = investor_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_businesses_updated_at ON public.businesses;
CREATE TRIGGER set_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_investor_preferences_updated_at ON public.investor_preferences;
CREATE TRIGGER set_investor_preferences_updated_at
BEFORE UPDATE ON public.investor_preferences
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_funding_applications_updated_at ON public.funding_applications;
CREATE TRIGGER set_funding_applications_updated_at
BEFORE UPDATE ON public.funding_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Storage Bucket and Policies for Investor CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('investor-cvs', 'investor-cvs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view investor CVs" ON storage.objects;
CREATE POLICY "Authenticated users can view investor CVs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'investor-cvs');

DROP POLICY IF EXISTS "Investors can upload own CV" ON storage.objects;
CREATE POLICY "Investors can upload own CV"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'investor-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Investors can update own CV" ON storage.objects;
CREATE POLICY "Investors can update own CV"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'investor-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Investors can delete own CV" ON storage.objects;
CREATE POLICY "Investors can delete own CV"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'investor-cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
