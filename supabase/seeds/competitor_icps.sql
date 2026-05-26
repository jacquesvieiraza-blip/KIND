-- ─────────────────────────────────────────────────────────────────────────────
-- KIND — Competitor-Targeting ICP Seed Configs
-- ─────────────────────────────────────────────────────────────────────────────
-- Targets users of: Lemlist, Instantly.ai, Clay, Apollo Sequences
-- Markets: South Africa (ZA), Nigeria (NG), Kenya (KE), Ghana (GH), Egypt (EG)
--
-- USAGE:
--   1. Replace '00000000-0000-0000-0000-000000000000' with the real client ID.
--      In production this is the FIGSY_KIND_CLIENT_ID value (K.I.N.D's own client row).
--   2. Run in the Supabase SQL Editor (or via psql / Supabase CLI seed).
--   3. After insertion, trigger a run from the admin dashboard or via
--      POST /icps/:id/run to populate leads immediately.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. LEMLIST USERS — SDRs & Sales teams at tech/SaaS cos using cold email ──
INSERT INTO public.icps (
  client_id,
  name,
  industries,
  job_titles,
  seniority_levels,
  company_sizes,
  geographies,
  tech_stack,
  keywords,
  apollo_only_consented,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Lemlist Users — Africa SaaS SDRs',
  ARRAY[
    'SaaS', 'Fintech', 'E-commerce', 'Consulting', 'Telecoms'
  ],
  ARRAY[
    'SDR', 'Sales Development Representative', 'Sales Manager',
    'Growth Hacker', 'Growth Manager', 'Business Development Manager',
    'Head of Sales', 'Sales Executive', 'Outbound Sales Manager'
  ],
  ARRAY[
    'Manager', 'Senior', 'Head of', 'Individual Contributor'
  ],
  ARRAY[
    '11–50', '51–200', '201–500'
  ],
  ARRAY[
    'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'
  ],
  ARRAY[
    'Lemlist', 'HubSpot', 'Pipedrive', 'Salesforce', 'LinkedIn Sales Navigator',
    'Gmail', 'Outlook', 'Apollo'
  ],
  ARRAY[
    'cold email', 'outbound sales', 'email sequences', 'lead generation',
    'sales automation', 'B2B sales', 'Lemlist alternative'
  ],
  true,
  true
);

-- ── 2. INSTANTLY.AI USERS — Agency operators & bootstrapped SaaS founders ────
INSERT INTO public.icps (
  client_id,
  name,
  industries,
  job_titles,
  seniority_levels,
  company_sizes,
  geographies,
  tech_stack,
  keywords,
  apollo_only_consented,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Instantly.ai Users — Africa Agencies & Founders',
  ARRAY[
    'SaaS', 'Consulting', 'Media', 'E-commerce', 'Fintech'
  ],
  ARRAY[
    'Founder', 'Co-Founder', 'CEO', 'Managing Director',
    'Agency Owner', 'Head of Growth', 'Growth Hacker',
    'SDR', 'Sales Development Representative', 'Outreach Specialist',
    'Email Marketing Manager', 'Digital Marketing Manager'
  ],
  ARRAY[
    'C-Suite', 'Head of', 'Manager', 'Individual Contributor'
  ],
  ARRAY[
    '1–10', '11–50', '51–200'
  ],
  ARRAY[
    'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'
  ],
  ARRAY[
    'Instantly', 'Instantly.ai', 'Smartlead', 'Mailreach', 'Lemlist',
    'Google Workspace', 'Slack', 'Notion', 'ClickUp', 'Stripe'
  ],
  ARRAY[
    'cold email agency', 'email warm-up', 'outreach automation', 'bootstrapped SaaS',
    'email deliverability', 'B2B leads', 'Instantly alternative', 'drip campaigns',
    'outbound agency', 'growth hacking'
  ],
  true,
  true
);

-- ── 3. CLAY USERS — RevOps, GTM Engineers & Demand Gen at funded startups ────
INSERT INTO public.icps (
  client_id,
  name,
  industries,
  job_titles,
  seniority_levels,
  company_sizes,
  geographies,
  tech_stack,
  keywords,
  apollo_only_consented,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Clay Users — Africa RevOps & GTM Engineers',
  ARRAY[
    'SaaS', 'Fintech', 'E-commerce', 'Logistics', 'Healthtech'
  ],
  ARRAY[
    'RevOps Manager', 'Revenue Operations', 'GTM Engineer', 'GTM Ops',
    'Growth Engineer', 'Demand Generation Manager', 'Demand Gen Specialist',
    'Head of Revenue Operations', 'Sales Operations Manager', 'Marketing Operations Manager',
    'Growth Lead', 'Growth Analyst', 'Data Analyst'
  ],
  ARRAY[
    'Manager', 'Senior', 'Head of', 'VP / Director'
  ],
  ARRAY[
    '51–200', '201–500', '501–1,000'
  ],
  ARRAY[
    'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'
  ],
  ARRAY[
    'Clay', 'Apollo', 'HubSpot', 'Salesforce', 'Segment',
    'Clearbit', 'ZoomInfo', 'Zapier', 'Make', 'n8n',
    'Airtable', 'Notion', 'dbt', 'Snowflake'
  ],
  ARRAY[
    'lead enrichment', 'data enrichment', 'GTM stack', 'RevOps', 'Series A',
    'Series B', 'Series C', 'funded startup', 'signal-based selling',
    'Clay alternative', 'waterfall enrichment', 'ICP automation'
  ],
  true,
  true
);

-- ── 4. APOLLO SEQUENCES USERS — AEs, SDRs & Sales Ops at mid-market tech ─────
INSERT INTO public.icps (
  client_id,
  name,
  industries,
  job_titles,
  seniority_levels,
  company_sizes,
  geographies,
  tech_stack,
  keywords,
  apollo_only_consented,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Apollo Sequences Users — Africa Mid-Market Sales',
  ARRAY[
    'SaaS', 'Fintech', 'Telecoms', 'Consulting', 'Manufacturing'
  ],
  ARRAY[
    'Account Executive', 'AE', 'SDR', 'Sales Development Representative',
    'Sales Operations Manager', 'Sales Ops', 'Sales Engineer',
    'Inside Sales Manager', 'Head of Sales Development',
    'VP of Sales', 'Director of Sales', 'Sales Enablement Manager'
  ],
  ARRAY[
    'Manager', 'Senior', 'Head of', 'VP / Director', 'Individual Contributor'
  ],
  ARRAY[
    '201–500', '501–1,000', '1,000+'
  ],
  ARRAY[
    'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt'
  ],
  ARRAY[
    'Apollo', 'Apollo.io', 'Outreach', 'Salesloft', 'Gong',
    'Salesforce', 'HubSpot', 'LinkedIn Sales Navigator', 'ZoomInfo', 'Chorus'
  ],
  ARRAY[
    'Apollo sequences', 'sales sequences', 'sales engagement platform',
    'AI sales', 'outbound pipeline', 'sales cadence', 'mid-market sales',
    'Apollo alternative', 'sales tech stack', 'pipeline automation',
    'email + LinkedIn outreach'
  ],
  true,
  true
);
