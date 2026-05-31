-- P3-13: African data moat — anonymised aggregate dataset
-- Structured queryable dataset of every lead, score, ICP, reply outcome across all clients.
-- No PII — names/emails stripped. Company-level aggregations only.

create table if not exists african_data_moat (
  id            uuid primary key default gen_random_uuid(),
  country       text not null,
  industry      text,
  seniority     text,
  company_size  text,
  job_title     text,
  score         integer,
  replied       boolean not null default false,
  reply_type    text,              -- positive/neutral/negative
  opened        boolean not null default false,
  meeting_booked boolean not null default false,
  sequence_step integer,          -- which step triggered the reply
  icp_keywords  text[],           -- keywords from the ICP (no client PII)
  enrichment_source text,         -- apollo/pdl/hunter/clearbit/none
  created_at    timestamptz not null default now(),
  aggregated_at timestamptz not null default now()
);

create index if not exists adm_country_idx   on african_data_moat(country);
create index if not exists adm_industry_idx  on african_data_moat(industry);
create index if not exists adm_seniority_idx on african_data_moat(seniority);

-- No RLS on this table — it is admin-only and contains no PII
-- API access is restricted to ADMIN_SECRET_KEY header only
