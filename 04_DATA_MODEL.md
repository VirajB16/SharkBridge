# SharkBridge — Data Model

## Core tables

### `profiles`
- `id` UUID primary key; same identifier as authenticated user
- `role` enum: `entrepreneur`, `investor`
- `full_name` text
- `email` text
- `created_at`, `updated_at` timestamps

### `businesses`
- `id` UUID primary key
- `owner_id` UUID → `profiles.id`
- `name` text
- `sector` text
- `description` text
- `stage` text
- `location` text nullable
- `target_customers` text nullable
- `monthly_revenue_inr` numeric nullable
- `monthly_expenses_inr` numeric nullable
- `growth_plan` text nullable
- `website_url` text nullable
- `created_at`, `updated_at` timestamps

### `investor_preferences`
- `id` UUID primary key
- `investor_id` UUID → `profiles.id`, unique
- `sectors` text array or normalized relation
- `min_amount_inr` numeric nullable
- `max_amount_inr` numeric nullable
- `preferred_stages` text array or normalized relation
- `preferred_locations` text array nullable
- `created_at`, `updated_at` timestamps

### `funding_applications`
- `id` UUID primary key
- `business_id` UUID → `businesses.id`
- `entrepreneur_id` UUID → `profiles.id`
- `investor_id` UUID → `profiles.id`
- `amount_requested_inr` numeric
- `use_of_funds` text
- `growth_plan` text
- `additional_notes` text nullable
- `ai_summary` text nullable
- `ai_missing_information` JSONB nullable
- `status` enum: `submitted`, `under_review`, `request_information`, `interested`, `declined`, `closed`
- `created_at`, `updated_at` timestamps

### Optional later tables
`connections`, `messages`, `notifications`, `application_status_history`.

## Data rules
- Funding amount must be greater than zero.
- Monthly revenue and expenses must be zero or greater when provided.
- Only an entrepreneur can own a business profile.
- Only the application’s target investor can change its review status.
- Only the application’s entrepreneur and target investor can view its private details.
- Investors can see only applications addressed to them unless the entrepreneur has explicitly made a business profile public.
- Do not store passwords directly; use Supabase Auth.
- Use synthetic demo data, not real sensitive financial documents.

## Matching score (simple and explainable)
Use a deterministic score out of 100:
- Sector match: 40 points
- Requested amount within investor's stated range: 30 points
- Business stage match: 20 points
- Location preference match, if both sides supplied it: up to 10 points

If a criterion is not supplied, do not silently treat it as a match; explain that the score is based on available profile data. Show match reasons in plain language. This score is a recommendation aid, not an investment risk score.
