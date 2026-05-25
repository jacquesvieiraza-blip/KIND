-- ─────────────────────────────────────────────────────────────────────────────
-- K.I.N.D — Competitor-Targeting ICP Configurations
-- Run AFTER upgrading Apollo to Basic/Professional plan
-- These target companies already paying for outbound tools in Africa —
-- the warmest possible leads. Proven buyers. Already sold on the category.
--
-- HOW TO USE:
-- 1. Replace '00000000-0000-0000-0000-000000000000' with your real client UUID
--    (find it in Supabase → clients table → your own company row → id column)
-- 2. Paste this entire file into Supabase → SQL Editor → Run
-- 3. Go to admin.get-kind.com → your client → ICPs → all 4 will appear
-- 4. Hit Run on each one
-- ─────────────────────────────────────────────────────────────────────────────

-- REPLACE THIS with your actual client UUID from the clients table
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
DO $$
DECLARE
  v_client_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN

-- ─────────────────────────────────────────────
-- ICP 1: Lemlist Users Africa
-- Companies using Lemlist = already paying for outreach tools
-- Proven buyers. Know what cold email is. Just need a managed version.
-- ─────────────────────────────────────────────
INSERT INTO public.icps (
  client_id, name,
  industries, job_titles, seniority_levels, company_sizes, geographies,
  tech_stack, keywords,
  apollo_only_consented, is_active
) VALUES (
  v_client_id,
  'Lemlist Users — Africa (Competitor Targeting)',
  ARRAY['Professional Services', 'SaaS', 'Marketing', 'Consulting', 'Fintech', 'Technology'],
  ARRAY['CEO', 'Founder', 'Co-Founder', 'Head of Sales', 'Sales Director', 'Managing Director', 'Growth Manager'],
  ARRAY['c_suite', 'vp', 'director', 'manager'],
  ARRAY['1-10', '11-50', '51-200'],
  ARRAY['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'],
  ARRAY['lemlist'],
  ARRAY['outreach', 'cold email', 'sales automation', 'lead generation'],
  true, true
);

-- ─────────────────────────────────────────────
-- ICP 2: Instantly / Smartlead Users Africa
-- High-volume senders. Already know what outreach infrastructure costs.
-- Pain: they have the tool but not the managed service or African leads.
-- ─────────────────────────────────────────────
INSERT INTO public.icps (
  client_id, name,
  industries, job_titles, seniority_levels, company_sizes, geographies,
  tech_stack, keywords,
  apollo_only_consented, is_active
) VALUES (
  v_client_id,
  'Instantly / Smartlead Users — Africa (Competitor Targeting)',
  ARRAY['Professional Services', 'Marketing', 'SaaS', 'Consulting', 'Agency', 'Technology'],
  ARRAY['CEO', 'Founder', 'Co-Founder', 'Agency Owner', 'Managing Director', 'Head of Growth', 'Operations Manager'],
  ARRAY['c_suite', 'vp', 'director', 'manager'],
  ARRAY['1-10', '11-50'],
  ARRAY['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'],
  ARRAY['instantly', 'smartlead'],
  ARRAY['cold email', 'email outreach', 'sales sequences', 'email deliverability'],
  true, true
);

-- ─────────────────────────────────────────────
-- ICP 3: Clay Users Africa
-- Most sophisticated buyers on this list. Data-driven, RevOps-minded.
-- Pain: Clay is expensive and requires a dedicated operator.
-- K.I.N.D pitch: "We do what Clay does but fully managed for Africa."
-- ─────────────────────────────────────────────
INSERT INTO public.icps (
  client_id, name,
  industries, job_titles, seniority_levels, company_sizes, geographies,
  tech_stack, keywords,
  apollo_only_consented, is_active
) VALUES (
  v_client_id,
  'Clay Users — Africa (Competitor Targeting)',
  ARRAY['SaaS', 'Fintech', 'Technology', 'Consulting', 'Professional Services'],
  ARRAY['Head of Growth', 'Revenue Operations', 'RevOps Manager', 'Founder', 'CEO', 'VP Sales', 'Head of Sales', 'Growth Lead'],
  ARRAY['c_suite', 'vp', 'director', 'manager'],
  ARRAY['11-50', '51-200'],
  ARRAY['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'],
  ARRAY['clay'],
  ARRAY['data enrichment', 'prospecting', 'revenue operations', 'sales intelligence', 'outbound'],
  true, true
);

-- ─────────────────────────────────────────────
-- ICP 4: Apollo Sequences Users Africa
-- Using Apollo's own sequences = paying $49–99/mo and doing it themselves.
-- K.I.N.D pitch: "Same data source, fully managed, POPIA compliant, ZAR billing."
-- Strongest competitor overlap. Most likely to understand and switch.
-- ─────────────────────────────────────────────
INSERT INTO public.icps (
  client_id, name,
  industries, job_titles, seniority_levels, company_sizes, geographies,
  tech_stack, keywords,
  apollo_only_consented, is_active
) VALUES (
  v_client_id,
  'Apollo Sequences Users — Africa (Competitor Targeting)',
  ARRAY['Professional Services', 'SaaS', 'Fintech', 'Technology', 'Consulting', 'Financial Services'],
  ARRAY['Head of Sales', 'CEO', 'Founder', 'Co-Founder', 'Sales Director', 'VP Sales', 'Managing Director', 'Business Development Manager'],
  ARRAY['c_suite', 'vp', 'director', 'manager'],
  ARRAY['11-50', '51-200', '201-500'],
  ARRAY['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'],
  ARRAY['apollo'],
  ARRAY['sales engagement', 'outbound sales', 'prospecting', 'B2B sales', 'lead generation'],
  true, true
);

RAISE NOTICE 'All 4 competitor-targeting ICPs created successfully for client %', v_client_id;
RAISE NOTICE 'Next step: Go to admin.get-kind.com → your client → ICPs → Run all 4';

END $$;
