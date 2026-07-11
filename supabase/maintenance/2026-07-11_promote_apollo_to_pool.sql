-- ============================================================================
-- PROMOTE APOLLO LEADS → lead_pool
--   Move the rightfully-owned Apollo leads under hello@get-kind.com into the
--   shared lead_pool, so new clients' ICP runs can be served them at $0 and
--   FIGSY can work them as a service (we are NOT redistributing raw data —
--   FIGSY provides the outreach service on top).
--
-- ⚠️  Run each PHASE separately, in order, in the Supabase SQL editor against
--     PRODUCTION. Read PHASE A before running PHASE B. Re-run safe: the insert
--     is ON CONFLICT (email_norm) DO NOTHING, so it never duplicates or
--     overwrites a pooled record.
--
-- Column mapping leads → lead_pool:
--   email_norm ← lower(trim(email))   (matches normalizeRevealEmail exactly, so
--                                      the reveal/P&L join by email_norm lines up)
--   title      ← job_title            (leads calls it job_title; pool calls it title)
--   source     ← 'apollo'             (allowed by lead_pool_source_chk)
--   acquisition_cost ← 0              (already owned — no marginal cost to reuse;
--                                      change the literal below if you want real
--                                      Apollo spend reflected in Money Path)
--   sourced_at ← leads.created_at     (real provenance timestamp)
-- Scope: the surviving real client (hello@get-kind.com), non-demo, email present.
-- Deduped by normalized email (distinct on) so a repeated address pools once.
-- ============================================================================


-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — PREVIEW (read-only, moves NOTHING). Run first.                 │
-- └────────────────────────────────────────────────────────────────────────┘

-- A1 · How many will move, how many already sit in the pool, pool size now:
with candidates as (
  select distinct on (lower(trim(l.email))) lower(trim(l.email)) as email_norm
  from public.leads l
  join public.clients c on c.id = l.client_id
  join auth.users   u on u.id = c.user_id
  where lower(u.email) = 'hello@get-kind.com'
    and coalesce(c.is_demo, false) = false
    and l.email is not null and trim(l.email) <> ''
  order by lower(trim(l.email))
)
select
  (select count(*) from candidates)                                          as will_insert_max,
  (select count(*) from candidates x
     where exists (select 1 from public.lead_pool p where p.email_norm = x.email_norm)) as already_pooled,
  (select count(*) from public.lead_pool)                                    as pool_now;

-- A2 · Eyeball a sample of exactly what will land in the pool:
select distinct on (lower(trim(l.email)))
  lower(trim(l.email)) as email_norm, l.first_name, l.last_name,
  l.job_title as title, l.company, l.country
from public.leads l
join public.clients c on c.id = l.client_id
join auth.users   u on u.id = c.user_id
where lower(u.email) = 'hello@get-kind.com'
  and coalesce(c.is_demo, false) = false
  and l.email is not null and trim(l.email) <> ''
order by lower(trim(l.email)), l.created_at desc
limit 10;


-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — THE MOVE. Inserts the deduped Apollo leads into lead_pool.      │
-- │ ON CONFLICT DO NOTHING → re-run safe, never overwrites a pooled record.   │
-- └────────────────────────────────────────────────────────────────────────┘
insert into public.lead_pool
  (email_norm, first_name, last_name, title, seniority, company, industry,
   company_size, country, linkedin_url, source, acquisition_cost, sourced_at)
select distinct on (lower(trim(l.email)))
  lower(trim(l.email)),
  l.first_name, l.last_name, l.job_title, l.seniority,
  l.company, l.industry, l.company_size, l.country, l.linkedin_url,
  'apollo',
  0,                    -- acquisition cost per record — already owned. Change if desired.
  l.created_at
from public.leads l
join public.clients c on c.id = l.client_id
join auth.users   u on u.id = c.user_id
where lower(u.email) = 'hello@get-kind.com'
  and coalesce(c.is_demo, false) = false
  and l.email is not null and trim(l.email) <> ''
order by lower(trim(l.email)), l.created_at desc
on conflict (email_norm) do nothing;


-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE C — VERIFY. Pool now holds the Apollo records.                     │
-- └────────────────────────────────────────────────────────────────────────┘
select coalesce(source, '(none)') as source, count(*)
from public.lead_pool group by 1 order by 2 desc;

select count(*) as pool_total from public.lead_pool;
