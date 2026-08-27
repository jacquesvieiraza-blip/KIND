-- ============================================================================
-- GEOGRAPHY AUDIT — READ ONLY. Every statement is SELECT-only; nothing mutates.
-- Counts / states / timestamps only; no name, email, company or LinkedIn is selected;
-- client and ICP ids are truncated to 8-char prefixes.
--
-- ⛓️ CORRECTED 27 Aug (merge-gate pass). The former companion file
-- `2026-08-27_lead_pool_country_backfill.sql` has been RETIRED and deleted: under R73
-- `public.leads` holds BOTH K.I.N.D-acquired and customer/inbound rows, and that script
-- drew country evidence from all of them. **PHASE A of
-- `2026-08-27_kind_acquired_pool_promotion.sql` is now the inventory/recovery authority** —
-- it carries the R73 rights boundary and identity-bound provenance. This pack answers only
-- the LIVE-lead questions: did freshly sourced leads lose geography, from which source, and
-- was any geography-constrained client given leads whose country is NULL or non-matching.
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
-- G2 · NULL-COUNTRY LEADS BY ORIGIN.
-- ⛓️ CORRECTED 27 Aug: this column was called `provider_sourced`, which was FALSE — the
-- manual `POST /leads` schema accepts an arbitrary `apollo_id` and stamps no source, so a
-- provider id present does NOT prove K.I.N.D acquisition. Renamed to what it actually
-- measures. `source` (now stamped truthfully by the provider loop) is the provenance column;
-- `provider_id_present` is only a hint. Counts only.
-- ────────────────────────────────────────────────────────────────────────────
select coalesce(source, '(none)')                                     as source,
       (apollo_id is not null)                                        as provider_id_present,
       (icp_id is not null)                                           as from_an_icp_run,
       count(*)                                                       as null_country_leads,
       min(created_at)                                                as oldest,
       max(created_at)                                                as newest
from public.leads
where coalesce(btrim(country), '') = ''
group by 1, 2, 3
order by null_country_leads desc;

-- ────────────────────────────────────────────────────────────────────────────
-- G3 · RECENT LIVE LEADS (21 days) WITH NULL COUNTRY — by day and origin.
-- ⛓️ Same correction as G2: `provider_id_present` is a hint, not proof of acquisition.
-- Rows created AFTER this PR deploys carry a truthful `leads.source` and need no hint.
-- ────────────────────────────────────────────────────────────────────────────
select date_trunc('day', created_at)::date                            as day,
       (apollo_id is not null)                                        as provider_id_present,
       count(*)                                                       as null_country_leads
from public.leads
where coalesce(btrim(country), '') = ''
  and created_at >= now() - interval '21 days'
group by 1, 2
order by 1 desc, 2 desc;

-- ────────────────────────────────────────────────────────────────────────────
-- G4 · POOL — NULL-country breakdown by source (the licensing/tripwire view too).
-- `source` values: 'pdl' (runtime writer) · 'backfill' (20260712 migration) ·
-- 'apollo' (2026-07-11 promotion) · 'manual' (pre-20260716 rows).
-- ⛓️ CORRECTED 27 Aug: R73 allows K.I.N.D-acquired **'pdl' AND 'apollo'** (not PDL-only),
-- and PR #1458 now enforces that allowlist on the READ as well as the write — the serve
-- path filters `source IN ('pdl','apollo')` in the database before its bounded LIMIT.
-- So rows below tagged 'backfill', 'manual' or NULL are NO LONGER served cross-client;
-- this shows how many are affected.
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
-- ⚠️⚠️ LIMITATION, STATED BEFORE THE NUMBERS: this compares HISTORICAL lead rows against
-- the ICP row's **CURRENT** geographies. ICP targeting can change over time and there is no
-- per-run targeting snapshot in the schema, so a "wrong_country" count here is NOT proof
-- that the lead violated the targeting IN FORCE when it was sourced — the client may simply
-- have narrowed their geography afterwards. Read `wrong_country` as "does not match TODAY'S
-- targeting", never as a proved historical mismatch. `null_country` has no such caveat: an
-- absent country could never satisfy any geography, at any time.
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
-- G8 · REMOVED — 27 Aug (merge-gate pass).
--
-- It computed recoverability by drawing country evidence from ALL of `public.leads`,
-- which under R73 includes customer/inbound rows — exactly the rights error that got the
-- old country backfill retired. Recreating it here would have recreated the defect.
--
-- ▶ USE `2026-08-27_kind_acquired_pool_promotion.sql` PHASE A INSTEAD. It carries the R73
--   rights boundary, identity-bound provenance (acquisition_memory matched on
--   (source, provider_id), never on email alone) and explicit ambiguity states.
-- ────────────────────────────────────────────────────────────────────────────
