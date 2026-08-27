-- ============================================================================
-- LEAD_POOL COUNTRY — MEASURE, THEN (ONLY IF THE EVIDENCE SUPPORTS IT) BACKFILL
--
-- WHY THIS EXISTS. A fresh Pass 1 targeting ["United States","United Kingdom"] served ZERO
-- from 85 owned pool rows, 18 of which matched on title. Every one of the 85 `country`
-- values is NULL, and the runtime matcher requires a country whenever the client named one.
-- The records are real inventory; what they lack is the one field that makes them servable.
--
-- ⚠️ THIS IS MAINTENANCE SQL, NOT A MIGRATION, AND THE DISTINCTION IS DELIBERATE.
-- A file under supabase/migrations/ with a matching PENDING_MIGRATIONS entry EXECUTES on the
-- next runner pass. A backfill whose recoverable count is currently unknown must never do
-- that. It lives here, beside 2026-07-11_promote_apollo_to_pool.sql, and runs only when the
-- founder chooses to run it, phase by phase, having read PHASE A first.
--
-- ⚠️ NOTHING HERE INVENTS A COUNTRY. No inference from company name, no guessing from an
-- email TLD, no city→country mapping, no provider call, no spend. The ONLY source is a
-- country value K.I.N.D already stores for that exact identity, matched on the normalised
-- email — the same `lower(btrim(email))` key `normalizeRevealEmail` uses, which is trim +
-- lowercase and nothing else, so the join is exact rather than approximate.
--
-- ⚠️ PHASE A IS READ-ONLY AND ANSWERS WHETHER PHASE B IS WORTH RUNNING AT ALL. If A3 returns
-- 0 recoverable, PHASE B is a no-op by construction — run it or don't, it changes nothing.
-- The likely outcome IS zero: `leads.country` is fed by the same provider mapping that left
-- the pool empty, so the null probably goes all the way back. Measure; do not assume.
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — EVIDENCE. READ ONLY. Moves nothing. Run this first, all of it.  │
-- └──────────────────────────────────────────────────────────────────────────┘

-- A1 · The shape of the problem: how much of the pool is unservable, and by which writer.
--      `source` tells you which of the three writers created each row.
select coalesce(source, '(untagged)')                                   as source,
       count(*)                                                         as rows,
       count(*) filter (where coalesce(btrim(country), '') = '')         as country_missing,
       count(*) filter (where coalesce(btrim(country), '') <> '')        as country_present,
       count(*) filter (where coalesce(btrim(title),   '') <> '')        as title_present,
       count(*) filter (where coalesce(btrim(industry),'') <> '')        as industry_present,
       count(*) filter (where coalesce(btrim(seniority),'') <> '')       as seniority_present,
       min(sourced_at)                                                   as oldest,
       max(sourced_at)                                                   as newest
from public.lead_pool
group by 1
order by rows desc;

-- A2 · Is the null already upstream? If `leads` is just as empty, nothing is recoverable
--      from it and the loss happened at the provider boundary, not at the pool write.
select count(*)                                                          as pool_rows_missing_country,
       count(l.email_norm)                                               as have_a_matching_lead_row,
       count(*) filter (where coalesce(btrim(l.country), '') <> '')       as lead_row_HAS_a_country
from public.lead_pool p
left join lateral (
  select lower(btrim(le.email)) as email_norm, le.country
  from public.leads le
  where lower(btrim(le.email)) = p.email_norm
    and coalesce(btrim(le.country), '') <> ''
  order by le.created_at asc
  limit 1
) l on true
where coalesce(btrim(p.country), '') = '';

-- A3 · ⚑ THE THREE NUMBERS THE AUDIT ASKS FOR.
--      RECOVERABLE  — exactly one distinct non-empty country across every owned source.
--      AMBIGUOUS    — two or more DIFFERENT countries for the same identity. Never guessed;
--                     these are skipped by PHASE B and reported here so they are not silent.
--      UNRECOVERABLE— no owned source holds a country for that identity.
with sources as (
  -- Every country K.I.N.D already holds for a pooled identity, from both owned stores.
  select lower(btrim(l.email)) as email_norm, lower(btrim(l.country)) as country
  from public.leads l
  where l.email is not null and btrim(l.email) <> '' and coalesce(btrim(l.country), '') <> ''
  union
  select lower(btrim(a.email_norm)), lower(btrim(a.country))
  from public.acquisition_memory a
  where a.email_norm is not null and btrim(a.email_norm) <> '' and coalesce(btrim(a.country), '') <> ''
), agg as (
  select p.email_norm, count(distinct s.country) as distinct_countries
  from public.lead_pool p
  left join sources s on s.email_norm = p.email_norm
  where coalesce(btrim(p.country), '') = ''
  group by p.email_norm
)
select count(*) filter (where distinct_countries = 1)  as recoverable_high_confidence,
       count(*) filter (where distinct_countries > 1)  as ambiguous_skipped,
       count(*) filter (where distinct_countries = 0)  as not_recoverable,
       count(*)                                        as total_missing_country
from agg;

-- A4 · Which countries would land, and how many rows each. Counts only — eyeball before B.
with sources as (
  select lower(btrim(l.email)) as email_norm, lower(btrim(l.country)) as country
  from public.leads l
  where l.email is not null and btrim(l.email) <> '' and coalesce(btrim(l.country), '') <> ''
  union
  select lower(btrim(a.email_norm)), lower(btrim(a.country))
  from public.acquisition_memory a
  where a.email_norm is not null and btrim(a.email_norm) <> '' and coalesce(btrim(a.country), '') <> ''
)
select min(s.country) as would_write, count(*) as rows
from public.lead_pool p
join sources s on s.email_norm = p.email_norm
where coalesce(btrim(p.country), '') = ''
group by p.email_norm
having count(distinct s.country) = 1
order by 1;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — THE BACKFILL. Run ONLY if A3 shows recoverable > 0.             │
-- │ ⚠️ DO NOT RUN THIS UNTIL THE FOUNDER HAS READ PHASE A.                     │
-- │                                                                           │
-- │ IDEMPOTENT — the WHERE clause requires the current value to be empty, so   │
-- │ a second run updates zero rows. NON-DESTRUCTIVE — it can only fill a       │
-- │ blank, never replace a country already stored. AMBIGUOUS ROWS ARE SKIPPED  │
-- │ by `having count(distinct country) = 1`, never resolved by picking one.    │
-- └──────────────────────────────────────────────────────────────────────────┘
update public.lead_pool p
   set country = r.country
  from (
    with sources as (
      select lower(btrim(l.email)) as email_norm, lower(btrim(l.country)) as country
      from public.leads l
      where l.email is not null and btrim(l.email) <> '' and coalesce(btrim(l.country), '') <> ''
      union
      select lower(btrim(a.email_norm)), lower(btrim(a.country))
      from public.acquisition_memory a
      where a.email_norm is not null and btrim(a.email_norm) <> '' and coalesce(btrim(a.country), '') <> ''
    )
    select s.email_norm, min(s.country) as country
    from sources s
    group by s.email_norm
    having count(distinct s.country) = 1        -- ONE answer, or no answer. Never a guess.
  ) r
 where p.email_norm = r.email_norm
   and coalesce(btrim(p.country), '') = '';     -- FILL ONLY. Cannot overwrite.


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE C — VERIFY. Read-only. Compare against A1.                          │
-- └──────────────────────────────────────────────────────────────────────────┘
select count(*)                                                    as pool_rows,
       count(*) filter (where coalesce(btrim(country), '') <> '')  as country_present,
       count(*) filter (where coalesce(btrim(country), '') = '')   as country_still_missing
from public.lead_pool;

-- C2 · Plausibility for the intended fresh Pass 1, AFTER the backfill. Counts only.
--      Country is compared against the canonical spellings the runtime now stores and
--      matches on ('united states' / 'united kingdom' and their alias forms).
select count(*) filter (where lower(btrim(country)) in
         ('us','u.s.','u.s.a.','usa','united states','united states of america','america'))  as us_rows,
       count(*) filter (where lower(btrim(country)) in
         ('uk','u.k.','gb','gbr','united kingdom','great britain','britain',
          'england','scotland','wales','northern ireland'))                                   as uk_rows
from public.lead_pool;
