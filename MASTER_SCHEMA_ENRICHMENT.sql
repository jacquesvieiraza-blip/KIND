-- Lead enrichment table
create table if not exists lead_enrichment (
  lead_id text primary key references leads(id) on delete cascade,
  recent_signal text,
  company_context text,
  opening_line text,
  enrichment_score int check (enrichment_score between 1 and 10),
  enriched_at timestamptz default now()
);

-- Index for fast lookups
create index if not exists lead_enrichment_enriched_at on lead_enrichment(enriched_at desc);
