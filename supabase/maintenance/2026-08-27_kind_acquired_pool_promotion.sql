-- ============================================================================
-- K.I.N.D-ACQUIRED INVENTORY → SHARED POOL PROMOTION (R73, 27 Aug)
--
-- ⚠️ MAINTENANCE SQL, NOT A MIGRATION — BY CONSTRUCTION IT CANNOT AUTO-RUN.
-- It lives in supabase/maintenance/ (like the 11-Jul promotion), has NO entry in
-- PENDING_MIGRATIONS (guarded by pool-country-contract.test.ts), and therefore is
-- never executed by the runner or any deploy. PHASE B runs only when the founder
-- pastes it into the SQL editor, having read PHASE A first.
--
-- THE RULE THIS IMPLEMENTS — founder ruling R73, verbatim:
--   "all client data we own. including apollo data can be used as a source for
--    clients too. it is data we own."
-- Buckets (mirrors classifyLeadRights in apps/api/src/lib/pool-sourcing.ts):
--   KIND_ACQUIRED    → source in ('pdl','apollo','lookalike'), OR source IS NULL
--                      with a provider id (the provider loop never stamped
--                      leads.source — a recorded gap, not an inference)
--   CUSTOMER_INBOUND → csv_import · web_form · company_csv · vida_chat ·
--                      milla_onboarding — EXCLUDED, needs a separate ruling
--   POOL_SERVED_COPY → no source, no provider id, email already pooled — a copy,
--                      not new inventory — EXCLUDED
--   UNKNOWN          → everything else — EXCLUDED, FAIL CLOSED
--
-- PROVIDER TRUTH FOR HISTORICAL ROWS — stated, never guessed:
--   · house account (hello@get-kind.com) rows → 'apollo' (its book is the Apollo
--     acquisition the 11-Jul script already promoted from)
--   · rows whose identity exists in acquisition_memory → that table's source
--   · client-account provider rows with NO memory record → provider AMBIGUOUS
--     (pre-AR5 sourcing mixed Apollo and PDL) → EXCLUDED BY PHASE B, counted in
--     PHASE A. Fail closed: a wrong provenance tag is worse than a missing row.
--
-- WHAT PHASE B NEVER DOES: no provider call · no spend · no inferred geography
-- (country comes only from the row's own value, canonicalised through the alias
-- CASE below, which mirrors packages/shared/src/launch-countries.ts — regenerate
-- both together) · never overwrites non-null pool metadata (ON CONFLICT DO
-- NOTHING + null-only heal) · idempotent (a second run changes nothing).
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ SHARED CLASSIFIER CTEs — copy this block above each phase when pasting.   │
-- └──────────────────────────────────────────────────────────────────────────┘
-- (Each statement below is self-contained; the WITH block repeats by design so
--  any single statement can be pasted alone into the SQL editor.)

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — DRY RUN. READ ONLY. Counts only, no PII. Run ALL of this first. │
-- └──────────────────────────────────────────────────────────────────────────┘

-- A1 · Every lead, classified. TERMINOLOGY IS DELIBERATE (corrected 27 Aug):
--     "metadata_complete" = email + canonicalisable country + role signal + not
--     already pooled. It is NOT a servability claim — runtime gates (canonical
--     geography vs a specific ICP, blocklist, DNC, per-client dedupe, env-based
--     suppression) are applied at serve time and partly cannot be reproduced in SQL.
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), classified as (
  select l.id,
         lower(btrim(l.email))                                   as email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))            as canon_country,
         (coalesce(btrim(l.job_title),'') <> '' or coalesce(btrim(l.industry),'') <> ''
           or coalesce(btrim(l.seniority),'') <> '')              as has_role,
         exists (select 1 from public.lead_pool p
                  where p.email_norm = lower(btrim(l.email)))      as already_pooled,
         case
           when lower(coalesce(l.source,'')) in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
             then 'CUSTOMER_INBOUND'
           when lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike') then 'KIND_ACQUIRED'
           when coalesce(btrim(l.source),'') = '' and l.apollo_id is not null then 'KIND_ACQUIRED'
           when coalesce(btrim(l.source),'') = '' and l.apollo_id is null
            and exists (select 1 from public.lead_pool p where p.email_norm = lower(btrim(l.email)))
             then 'POOL_SERVED_COPY'
           else 'UNKNOWN'
         end                                                      as bucket,
         case
           when exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                         where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
             then 'apollo'
           when lower(coalesce(l.source,'')) = 'lookalike' then 'pdl'
           else (select am.source from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email)) limit 1)
         end                                                      as provable_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
)
select bucket,
       count(*)                                                            as leads,
       count(*) filter (where canon_country is not null and has_role
                          and not already_pooled)                          as metadata_complete_candidates,
       count(*) filter (where canon_country is not null and has_role
                          and not already_pooled
                          and bucket = 'KIND_ACQUIRED'
                          and provable_provider is not null)               as safely_promotable_now,
       count(*) filter (where bucket = 'KIND_ACQUIRED'
                          and provable_provider is null)                   as provider_ambiguous_excluded,
       count(*) filter (where already_pooled)                              as already_pooled
from classified
group by bucket order by leads desc;

-- A2 · Safely promotable, by the provider that would be recorded. Counts only.
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), promotable as (
  select distinct on (lower(btrim(l.email)))
         lower(btrim(l.email)) as email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)),''))             as canon_country,
         case
           when exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                         where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') then 'apollo'
           when lower(coalesce(l.source,'')) = 'lookalike' then 'pdl'
           else (select am.source from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email)) limit 1)
         end as provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or (coalesce(btrim(l.source),'') = '' and l.apollo_id is not null))
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
    and (coalesce(btrim(l.job_title),'') <> '' or coalesce(btrim(l.industry),'') <> ''
      or coalesce(btrim(l.seniority),'') <> '')
    and not exists (select 1 from public.lead_pool p where p.email_norm = lower(btrim(l.email)))
  order by lower(btrim(l.email)), l.created_at asc
)
select provider, count(*) as safely_promotable, count(*) filter (where canon_country is not null) as with_canonical_country
from promotable
where provider is not null
group by provider;

-- A3 · CURRENT PASS-1 ICP AUDIT — the launch ICP, counts only.
--     Geographies: United States + United Kingdom · Titles: Founder/CEO/CRO/VP Sales/
--     Sales Director/Head of Sales · Industry: software/SaaS · Seniority: director+.
--     Role matching mirrors runtime's OR-substring semantics; geography mirrors the
--     canonical contract. ⚠️ CAVEATS (what SQL cannot reproduce): the DNC floor's
--     SUPPRESSED_DOMAINS env additions · runtime candidate-window ordering · Pass-1
--     client dedupe (depends on which client runs it — a FRESH client owns nothing).
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
), pool_view as (
  select p.email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(p.country))),
                  nullif(lower(btrim(p.country)),'')) as canon_country,
         p.title, p.industry, p.seniority
  from public.lead_pool p
), kind_leads as (
  select distinct on (lower(btrim(l.email)))
         lower(btrim(l.email)) as email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)),'')) as canon_country,
         l.job_title as title, l.industry, l.seniority
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or (coalesce(btrim(l.source),'') = '' and l.apollo_id is not null))
  order by lower(btrim(l.email)), l.created_at asc
), scored as (
  select 'in pool today' as store, email_norm, canon_country, title, industry, seniority from pool_view
  union all
  select 'kind-acquired leads (incl. not yet pooled)', email_norm, canon_country, title, industry, seniority from kind_leads
)
select store,
       count(*)                                                                  as rows,
       count(*) filter (where canon_country in ('united states','united kingdom')) as geo_match,
       count(*) filter (where lower(coalesce(title,'')) similar to
         '%(founder|ceo|chief executive|cro|chief revenue|vp sales|vp of sales|sales director|director of sales|head of sales)%'
         or lower(coalesce(industry,'')) similar to '%(software|saas)%'
         or lower(coalesce(seniority,'')) similar to '%(director|vp|c_suite|c-suite|owner|founder|head|chief)%') as role_match,
       count(*) filter (where canon_country in ('united states','united kingdom')
         and (lower(coalesce(title,'')) similar to
           '%(founder|ceo|chief executive|cro|chief revenue|vp sales|vp of sales|sales director|director of sales|head of sales)%'
           or lower(coalesce(industry,'')) similar to '%(software|saas)%'
           or lower(coalesce(seniority,'')) similar to '%(director|vp|c_suite|c-suite|owner|founder|head|chief)%'))
                                                                                as likely_runtime_servable_estimate
from scored
group by store;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — THE PROMOTION. FOUNDER-CONTROLLED ONLY. DO NOT RUN UNREAD.      │
-- │ Idempotent · K.I.N.D-ACQUIRED only · provider stated or row skipped ·     │
-- │ customer/inbound excluded by construction · unknown fails closed ·        │
-- │ ON CONFLICT DO NOTHING (never overwrites) · one transaction.              │
-- └──────────────────────────────────────────────────────────────────────────┘
begin;

with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), promotable as (
  select distinct on (lower(btrim(l.email)))
         lower(btrim(l.email))                                   as email_norm,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company, l.industry,
         l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)),''))             as canon_country,
         case
           when exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                         where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') then 'apollo'
           when lower(coalesce(l.source,'')) = 'lookalike' then 'pdl'
           else (select am.source from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email)) limit 1)
         end                                                      as provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    -- KIND_ACQUIRED only; customer/inbound EXCLUDED BY CONSTRUCTION; unknown falls out
    -- because it matches neither arm below (fail closed):
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or (coalesce(btrim(l.source),'') = '' and l.apollo_id is not null))
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
  order by lower(btrim(l.email)), l.created_at asc
)
insert into public.lead_pool
  (email_norm, first_name, last_name, title, seniority, company, industry,
   company_size, country, linkedin_url, source, acquisition_cost, sourced_at)
select p.email_norm, p.first_name, p.last_name, p.job_title, p.seniority, p.company,
       p.industry, p.company_size,
       p.canon_country,                    -- canonical or NULL; NULL rows pool but are geo-unservable
       p.linkedin_url,
       p.provider,                         -- the PROVABLE provider — see WHERE below
       case when p.provider = 'pdl' then 0.28 else 0 end,
       p.created_at
from promotable p
where p.provider is not null               -- provider ambiguous → EXCLUDED, fail closed
on conflict (email_norm) do nothing;       -- never overwrites an existing pooled record

-- Null-only country heal for rows that already existed without a country — the WHERE
-- clause makes overwriting a known country structurally impossible.
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), src as (
  select lower(btrim(l.email)) as email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)),'')) as canon_country
  from public.leads l
  where coalesce(btrim(l.email),'') <> '' and coalesce(btrim(l.country),'') <> ''
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or (coalesce(btrim(l.source),'') = '' and l.apollo_id is not null))
), one_answer as (
  select email_norm, min(canon_country) as canon_country
  from src group by email_norm
  having count(distinct canon_country) = 1          -- one answer or no answer, never a guess
)
update public.lead_pool p
   set country = o.canon_country
  from one_answer o
 where p.email_norm = o.email_norm
   and coalesce(btrim(p.country),'') = '';          -- FILL ONLY — cannot overwrite

commit;

-- AFTER counts — compare with PHASE A.
select count(*)                                                    as pool_rows_after,
       count(*) filter (where coalesce(btrim(country),'') <> '')   as with_country,
       count(*) filter (where source = 'pdl')                      as pdl_rows,
       count(*) filter (where source = 'apollo')                   as apollo_rows
from public.lead_pool;
