-- ==============================================================================
-- Migration 002: Add GSTIN to businesses, Equity Stake to funding_applications,
-- and CV storage columns to investor_preferences.
-- ==============================================================================

-- 1. Add optional GSTIN to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS gstin TEXT;

-- 2. Add equity stake (%) to funding_applications table
ALTER TABLE public.funding_applications
ADD COLUMN IF NOT EXISTS equity_stake_pct NUMERIC CHECK (equity_stake_pct IS NULL OR (equity_stake_pct >= 0 AND equity_stake_pct <= 100));

-- 3. Add CV file storage columns to investor_preferences table
ALTER TABLE public.investor_preferences
ADD COLUMN IF NOT EXISTS cv_file_url TEXT;

ALTER TABLE public.investor_preferences
ADD COLUMN IF NOT EXISTS cv_file_name TEXT;

-- 4. Create investor-cvs bucket in Supabase storage if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('investor-cvs', 'investor-cvs', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for investor-cvs
-- Allow authenticated users to view/download CVs
DROP POLICY IF EXISTS "Authenticated users can view investor CVs" ON storage.objects;
CREATE POLICY "Authenticated users can view investor CVs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'investor-cvs');

-- Allow investors to upload/update their own CV
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
