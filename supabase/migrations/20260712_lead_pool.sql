-- 20260712_lead_pool.sql
-- SPRINT 8a·③ (#448 + #449 p1-2) — THE LEAD POOL + per-record P&L.
--
-- Records become INVENTORY. Every email we source (PDL $0.28/record, spent BEFORE any
-- client charge) lands in the shared `lead_pool`. A record earns back its acquisition
-- cost as clients REVEAL it ($1 each, tracked in client_reveals) and as FIGSY WORKS it
-- ($3 each, tracked in figsy_enrollments). `lead_pool_pnl` is the read-only per-record
-- ledger the admin Money Path reads to see which records paid for themselves.
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT / CREATE OR REPLACE VIEW throughout.
-- Run on STAGING (kind-staging) first, then PRODUCTION.

-- ── 1. lead_pool — the shared record store (records = inventory) ──────────────
-- EXACT schema PR4 depends on — do not deviate. email_norm is the PK (lower+btrim of
-- the email), matching the reveal ledger key (client_reveals.email_norm) so a record
-- joins 1:1 to its reveals and its FIGSY works.
CREATE TABLE IF NOT EXISTS public.lead_pool (
  email_norm       text PRIMARY KEY,
  first_name       text,
  last_name        text,
  title            text,
  seniority        text,
  company          text,
  industry         text,
  company_size     text,
  country          text,
  linkedin_url     text,
  source           text,
  acquisition_cost numeric NOT NULL DEFAULT 0.28,
  sourced_at       timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS lead_pool_title_country_idx ON public.lead_pool (lower(title), lower(country));
CREATE INDEX IF NOT EXISTS lead_pool_industry_idx ON public.lead_pool (lower(industry));

-- ── 2. lead_pool_pnl — read-only per-record P&L ──────────────────────────────
-- For each pooled record: how many clients revealed it (client_reveals by email_norm)
-- and how many FIGSY enrollments worked it (figsy_enrollments → leads → normalized
-- email). revenue_usd = reveals×$1 + works×$3; roi = revenue / acquisition_cost.
-- LEFT JOINs keep a never-revealed record correct (0 reveals, 0 works → revenue 0,
-- roi 0). Admin reads this via the service role — no extra grants.
CREATE OR REPLACE VIEW public.lead_pool_pnl AS
SELECT
  lp.email_norm,
  lp.company,
  lp.title,
  lp.acquisition_cost,
  COALESCE(r.reveals, 0)::int AS reveals,
  COALESCE(w.works,   0)::int AS works,
  (COALESCE(r.reveals, 0) * 1 + COALESCE(w.works, 0) * 3)::numeric AS revenue_usd,
  ((COALESCE(r.reveals, 0) * 1 + COALESCE(w.works, 0) * 3)::numeric
     / NULLIF(lp.acquisition_cost, 0)) AS roi
FROM public.lead_pool lp
LEFT JOIN (
  SELECT email_norm, COUNT(*) AS reveals
  FROM public.client_reveals
  GROUP BY email_norm
) r ON r.email_norm = lp.email_norm
LEFT JOIN (
  -- figsy_enrollments carries lead_id; the lead carries the email. Normalize the
  -- lead's email the same way (lower+btrim) so it lines up with email_norm.
  SELECT lower(btrim(l.email)) AS email_norm, COUNT(*) AS works
  FROM public.figsy_enrollments fe
  JOIN public.leads l ON l.id = fe.lead_id
  WHERE l.email IS NOT NULL AND btrim(l.email) <> ''
  GROUP BY lower(btrim(l.email))
) w ON w.email_norm = lp.email_norm;

-- ── 3. Backfill lead_pool from existing emailed leads ────────────────────────
-- One row per distinct normalized email; earliest lead wins its metadata. Records
-- already pooled are left untouched (ON CONFLICT DO NOTHING) so a re-run is a no-op.
INSERT INTO public.lead_pool (
  email_norm, first_name, last_name, title, seniority,
  company, industry, company_size, country, linkedin_url,
  source, acquisition_cost
)
SELECT DISTINCT ON (lower(btrim(l.email)))
  lower(btrim(l.email)) AS email_norm,
  l.first_name,
  l.last_name,
  l.job_title,
  l.seniority,
  l.company,
  l.industry,
  l.company_size,
  l.country,
  l.linkedin_url,
  'backfill' AS source,
  0.28       AS acquisition_cost
FROM public.leads l
WHERE l.email IS NOT NULL AND btrim(l.email) <> ''
ORDER BY lower(btrim(l.email)), l.created_at ASC   -- earliest lead wins
ON CONFLICT (email_norm) DO NOTHING;

-- ── 4. Cents fix — round the raw-float sourcing costs ────────────────────────
-- try_spend_sourcing writes records × 0.28 as a raw float (e.g. 2.8000000000000003).
-- Round the historical rows to cents so the Money Path sums read clean. NON-destructive
-- and idempotent (rounding an already-rounded value is a no-op); the RPC is untouched.
UPDATE public.sourcing_ledger SET cost_usd = round(cost_usd::numeric, 2);
