-- ============================================================================
-- GEOGRAPHY AUDIT — READ ONLY. Every statement is SELECT-only; nothing mutates.
-- Counts / states / timestamps only; no name, email, company or LinkedIn is selected;
-- client and ICP ids are truncated to 8-char prefixes.
--
-- Companion to 2026-08-27_lead_pool_country_backfill.sql (whose PHASE A stays the
-- recoverability authority). This pack answers the LIVE-lead questions: did freshly
-- sourced leads lose geography, from which source, and was any geography-constrained
-- client actually given leads whose country is NULL or non-matching.
--
-- ⚠️ THE ALIAS CASE BLOCK BELOW MIRRORS packages/shared/src/launch-countries.ts
-- (founder-locked alias table, 24 Aug). It exists because SQL cannot import TypeScript.
-- If the shared table changes, re-generate this file — do not edit one without the other.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- G1 · ALL LEADS — how many carry a country at all
-- ────────────────────────────────────────────────────────────────────────────
select count(*)                                                       as total_leads,
       count(*) filter (where coalesce(btrim(country), '') <> '')      as country_present,
       count(*) filter (where coalesce(btrim(country), '') =  '')      as country_missing
from public.leads;

-- ────────────────────────────────────────────────────────────────────────────
-- G2 · NULL-COUNTRY LEADS BY ORIGIN. `apollo_id` present = provider-sourced through the
-- contact pipeline (PDL rows carry the provider id in the same column); `source` and
-- `icp_id` refine it. Counts only.
-- ────────────────────────────────────────────────────────────────────────────
select coalesce(source, '(none)')                                     as source,
       (apollo_id is not null)                                        as provider_sourced,
       (icp_id is not null)                                           as from_an_icp_run,
       count(*)                                                       as null_country_leads,
       min(created_at)                                                as oldest,
       max(created_at)                                                as newest
from public.leads
where coalesce(btrim(country), '') = ''
group by 1, 2, 3
order by null_country_leads desc;

-- ────────────────────────────────────────────────────────────────────────────
-- G3 · RECENT LIVE LEADS (21 days) WITH NULL COUNTRY — by day and origin. If provider
-- sourcing was losing geography recently, it shows here as provider_sourced=true rows.
-- ────────────────────────────────────────────────────────────────────────────
select date_trunc('day', created_at)::date                            as day,
       (apollo_id is not null)                                        as provider_sourced,
       count(*)                                                       as null_country_leads
from public.leads
where coalesce(btrim(country), '') = ''
  and created_at >= now() - interval '21 days'
group by 1, 2
order by 1 desc, 2 desc;

-- ────────────────────────────────────────────────────────────────────────────
-- G4 · POOL — NULL-country breakdown by source (the licensing/tripwire view too).
-- `source` values: 'pdl' (runtime writer) · 'backfill' (20260712 migration) ·
-- 'apollo' (2026-07-11 promotion) · 'manual' (pre-20260716 rows). Code currently
-- allowlists ONLY 'pdl' for cross-client POOL WRITES, but the SERVE path reads the
-- pool with NO source filter — so every source below is served cross-client today.
-- That gap is reported in PR #1458; this shows its real size.
-- ────────────────────────────────────────────────────────────────────────────
select coalesce(source, '(untagged)')                                 as source,
       count(*)                                                       as rows,
       count(*) filter (where coalesce(btrim(country), '') = '')       as country_missing,
       count(*) filter (where coalesce(btrim(country), '') <> '')      as country_present
from public.lead_pool
group by 1
order by rows desc;

-- ────────────────────────────────────────────────────────────────────────────
-- G5 · RECENT RUNS — outcome vs the country integrity of what they inserted.
-- For each of the last 25 run outcomes: what the run recorded, and how many of the
-- leads that ICP+client hold from around that time have no country.
-- ────────────────────────────────────────────────────────────────────────────
select left(o.client_id::text, 8)                                     as client_prefix,
       left(o.icp_id::text, 8)                                        as icp_prefix,
       o.status, o.records_requested, o.pool_served, o.total_inserted,
       o.created_at                                                   as run_terminal_at,
       (select count(*) from public.leads l
         where l.icp_id = o.icp_id and l.client_id = o.client_id)      as leads_total,
       (select count(*) from public.leads l
         where l.icp_id = o.icp_id and l.client_id = o.client_id
           and coalesce(btrim(l.country), '') = '')                    as leads_null_country
from public.icp_run_outcomes o
order by o.created_at desc
limit 25;

-- ────────────────────────────────────────────────────────────────────────────
-- G6 · ⚑ THE CRITICAL ONE — geography-constrained clients holding leads whose country
-- is NULL or canonically OUTSIDE their selected geographies.
--
-- canon(x) mirrors canonicalLaunchCountry: alias → canonical lowercase full name;
-- unrecognised terms lowercase-trimmed; blank → ''. A lead "violates" when the ICP has
-- geographies AND the lead's canonical country is not one of the ICP's canonical
-- geographies (NULL country counts as a violation for a geo-constrained ICP).
-- ────────────────────────────────────────────────────────────────────────────
with canon as (
  select unnest(array[
    'us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
    'united states' as canonical
  union all select unnest(array[
    'uk','u.k.','gb','gbr','united kingdom','great britain','britain',
    'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array[
    'za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), geo_icps as (
  select i.id, i.client_id,
         array(select coalesce(c.canonical, lower(btrim(g)))
                 from unnest(i.geographies) g
                 left join canon c on c.alias = lower(btrim(g))) as canon_geos
  from public.icps i
  where i.geographies is not null and array_length(i.geographies, 1) > 0
)
select left(gi.client_id::text, 8)                                    as client_prefix,
       left(gi.id::text, 8)                                           as icp_prefix,
       count(l.id)                                                    as leads_on_this_icp,
       count(*) filter (where coalesce(btrim(l.country), '') = '')     as null_country,
       count(*) filter (where coalesce(btrim(l.country), '') <> ''
         and not (coalesce((select c2.canonical from canon c2
                             where c2.alias = lower(btrim(l.country))),
                           lower(btrim(l.country))) = any(gi.canon_geos)))
                                                                      as wrong_country
from geo_icps gi
join public.leads l on l.icp_id = gi.id and l.client_id = gi.client_id
group by 1, 2, gi.canon_geos
having count(*) filter (where coalesce(btrim(l.country), '') = '') > 0
    or count(*) filter (where coalesce(btrim(l.country), '') <> ''
         and not (coalesce((select c2.canonical from canon c2
                             where c2.alias = lower(btrim(l.country))),
                           lower(btrim(l.country))) = any(gi.canon_geos))) > 0
order by null_country + wrong_country desc;

-- ────────────────────────────────────────────────────────────────────────────
-- G7 · HISTORICAL "IT WORKED" — where did each run's leads actually come from?
-- pool-served leads have apollo_id IS NULL; provider-kept leads carry the provider id.
-- Read together with G5: pool_served vs total_inserted per outcome splits the mix.
-- ────────────────────────────────────────────────────────────────────────────
select date_trunc('day', o.created_at)::date                          as day,
       o.status,
       count(*)                                                       as runs,
       sum(o.pool_served)                                             as pool_served_sum,
       sum(o.total_inserted - o.pool_served)                          as provider_kept_sum
from public.icp_run_outcomes o
group by 1, 2
order by 1 desc, 2;

-- ────────────────────────────────────────────────────────────────────────────
-- G8 · RECOVERABILITY WITH SOURCE-OF-RECOVERY — extends PHASE A / A3 of the backfill
-- file: the same three numbers, but split by WHERE the recoverable country would come
-- from (a leads row, acquisition_memory, or both agreeing).
-- ────────────────────────────────────────────────────────────────────────────
with lead_src as (
  select lower(btrim(l.email)) as email_norm, lower(btrim(l.country)) as country
  from public.leads l
  where l.email is not null and btrim(l.email) <> '' and coalesce(btrim(l.country), '') <> ''
), mem_src as (
  select lower(btrim(a.email_norm)) as email_norm, lower(btrim(a.country)) as country
  from public.acquisition_memory a
  where a.email_norm is not null and btrim(a.email_norm) <> '' and coalesce(btrim(a.country), '') <> ''
), agg as (
  select p.email_norm,
         (select count(distinct s.country) from (
            select country from lead_src where email_norm = p.email_norm
            union select country from mem_src where email_norm = p.email_norm) s) as distinct_countries,
         exists (select 1 from lead_src where email_norm = p.email_norm)          as in_leads,
         exists (select 1 from mem_src  where email_norm = p.email_norm)          as in_memory
  from public.lead_pool p
  where coalesce(btrim(p.country), '') = ''
)
select count(*) filter (where distinct_countries = 1 and in_leads and in_memory) as recoverable_both_agree,
       count(*) filter (where distinct_countries = 1 and in_leads and not in_memory) as recoverable_from_leads_only,
       count(*) filter (where distinct_countries = 1 and in_memory and not in_leads) as recoverable_from_memory_only,
       count(*) filter (where distinct_countries > 1)                            as ambiguous_skipped,
       count(*) filter (where distinct_countries = 0)                            as not_recoverable,
       count(*)                                                                  as total_missing_country
from agg;
