-- ============================================================================
-- K.I.N.D-ACQUIRED INVENTORY → SHARED POOL PROMOTION (R73, 27 Aug · corrected
-- 27 Aug evening on GPT-5.6's diff review: deterministic provider resolution —
-- NO LIMIT 1, truthful historical cost, progressive Pass-1 funnel)
--
-- ⚠️ MAINTENANCE SQL, NOT A MIGRATION — BY CONSTRUCTION IT CANNOT AUTO-RUN.
-- It lives in supabase/maintenance/, has NO entry in PENDING_MIGRATIONS (a test
-- fails if one ever appears), and is executed only when the founder pastes it
-- into the SQL editor, having read PHASE A first.
--
-- THE RULE — founder ruling R73, verbatim:
--   "all client data we own. including apollo data can be used as a source for
--    clients too. it is data we own."
--
-- RIGHTS BUCKETS (mirrors classifyLeadRights, pool-sourcing.ts):
--   CUSTOMER_INBOUND → csv_import · web_form · company_csv · vida_chat ·
--                      milla_onboarding — EXCLUDED, the tag always wins
--   KIND_ACQUIRED    → provider provable via the RESOLVER below
--   POOL_SERVED_COPY → no source, no provider id, email already pooled — EXCLUDED
--   UNKNOWN          → everything else — EXCLUDED, FAIL CLOSED
--   ⚠️ a bare provider id is NOT proof of acquisition: the manual POST /leads
--   schema accepts `apollo_id` from a client and stamps no source. Corroboration
--   (house book, or unique acquisition-memory provenance) is REQUIRED.
--
-- PROVIDER RESOLUTION (mirrors resolveHistoricalProvider, pool-sourcing.ts —
-- deterministic, never an arbitrary pick, NO LIMIT 1):
--   A. customer/inbound tag              → excluded
--   B. leads.source = 'pdl' | 'apollo'   → that exact provider
--   C. leads.source = 'lookalike'        → 'pdl' (route calls pdlSearchPeople)
--   D. house account (hello@get-kind.com)→ 'apollo' (the founder's own book —
--        the fact the 11-Jul promotion already relied on)
--   E. acquisition_memory                → ONLY if EXACTLY ONE distinct eligible
--        provider in ('pdl','apollo') exists for the identity; 0 or 2+ distinct
--        → ambiguous → EXCLUDED. Unexpected sources ('hunter', …) are never
--        eligible merely by being non-null.
--   Final guard either way: provider IN ('pdl','apollo') or the row is skipped.
--
-- COST RESOLUTION (original truth, never today's rate painted over history):
--   ① acquisition_memory holds the ORIGINAL acquisition_cost_usd, written once
--      at acquisition (ON CONFLICT DO NOTHING). Where a memory record exists for
--      the resolved provider, its recorded cost is carried. If several records
--      exist for one identity+provider, the LOWEST recorded cost is used —
--      conservative: never inflates, never invents.
--   ② house-account 'apollo' rows with no memory record → 0, which is PROVEN
--      existing accounting, not a guess: api_search is Apollo's no-credit
--      endpoint and the founder's own 11-Jul script booked this same book at 0
--      ("already owned — no marginal cost to reuse").
--   ③ anything else without a provable cost (e.g. 'lookalike' rows — that route
--      never wrote acquisition_memory) → EXCLUDED and COUNTED in PHASE A as
--      cost_unprovable_excluded. lead_pool.acquisition_cost is NOT NULL, so the
--      honest alternative to a provable number is a skip, never a fabrication.
--
-- WHAT PHASE B NEVER DOES: no provider call · no spend · no inferred geography ·
-- never overwrites non-null pool metadata (ON CONFLICT DO NOTHING + fill-only
-- heal) · idempotent (a second run changes nothing).
--
-- The country alias CASE mirrors packages/shared/src/launch-countries.ts —
-- regenerate both together, never edit one alone.
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — DRY RUN. READ ONLY. Counts only, no PII. Run ALL of this first. │
-- └──────────────────────────────────────────────────────────────────────────┘

-- A1 · Every lead, classified, with the DETERMINISTIC provider resolution.
--     "metadata_complete" = email + canonicalisable country + role signal + not
--     already pooled. It is NOT a servability claim — see A3's funnel.
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), resolved as (
  select l.id,
         lower(btrim(l.email))                                    as email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))             as canon_country,
         (coalesce(btrim(l.job_title),'') <> '' or coalesce(btrim(l.industry),'') <> ''
           or coalesce(btrim(l.seniority),'') <> '')               as has_role,
         exists (select 1 from public.lead_pool p
                  where p.email_norm = lower(btrim(l.email)))       as already_pooled,
         (lower(coalesce(l.source,'')) in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding'))
                                                                   as is_customer,
         -- THE RESOLVER, steps B → C → D → E. No LIMIT 1 anywhere.
         case
           when lower(coalesce(l.source,'')) in ('pdl','apollo') then lower(l.source)
           when lower(coalesce(l.source,'')) = 'lookalike' then 'pdl'
           when exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                         where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
             then 'apollo'
           else (select case when count(distinct lower(btrim(am.source))) = 1
                             then min(lower(btrim(am.source))) end
                   from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email))
                    and lower(btrim(am.source)) in ('pdl','apollo'))
         end                                                       as provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
)
select case
         when is_customer then 'CUSTOMER_INBOUND (excluded)'
         when provider in ('pdl','apollo') then 'KIND_ACQUIRED (provider proven)'
         when already_pooled then 'POOL_SERVED_COPY or already pooled (excluded)'
         else 'UNKNOWN / provider ambiguous (excluded, fail closed)'
       end                                                                as bucket,
       count(*)                                                           as leads,
       count(*) filter (where canon_country is not null and has_role
                          and not already_pooled)                         as metadata_complete_candidates,
       count(*) filter (where canon_country is not null and has_role
                          and not already_pooled and not is_customer
                          and provider in ('pdl','apollo'))               as safely_promotable_now
from resolved
group by 1 order by leads desc;

-- A2 · Safely promotable by provider, with the COST resolution applied — including
--     how many are excluded because their original cost cannot be proven (rule ③).
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), cand as (
  select distinct on (lower(btrim(l.email)))
         lower(btrim(l.email)) as email_norm,
         case
           when lower(coalesce(l.source,'')) in ('pdl','apollo') then lower(l.source)
           when lower(coalesce(l.source,'')) = 'lookalike' then 'pdl'
           when exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                         where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
             then 'apollo'
           else (select case when count(distinct lower(btrim(am.source))) = 1
                             then min(lower(btrim(am.source))) end
                   from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email))
                    and lower(btrim(am.source)) in ('pdl','apollo'))
         end as provider,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
    and not exists (select 1 from public.lead_pool p where p.email_norm = lower(btrim(l.email)))
  order by lower(btrim(l.email)), l.created_at asc
), costed as (
  select cand.*,
         (select min(am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = cand.email_norm
             and lower(btrim(am.source)) = cand.provider)          as memory_cost,
         case
           when (select min(am.acquisition_cost_usd) from public.acquisition_memory am
                  where am.email_norm = cand.email_norm
                    and lower(btrim(am.source)) = cand.provider) is not null
             then (select min(am.acquisition_cost_usd) from public.acquisition_memory am
                    where am.email_norm = cand.email_norm
                      and lower(btrim(am.source)) = cand.provider)
           when cand.provider = 'apollo' and cand.is_house then 0
           else null                                               -- cost unprovable → excluded
         end                                                       as resolved_cost
  from cand
  where cand.provider in ('pdl','apollo')
)
select provider,
       count(*)                                                    as provider_proven,
       count(*) filter (where resolved_cost is not null)           as promotable_with_provable_cost,
       count(*) filter (where resolved_cost is null)               as cost_unprovable_excluded
from costed
group by provider;

-- A3 · CURRENT PASS-1 INVENTORY FUNNEL — progressive SQL-visible gates, counts only.
--     Launch ICP: US + UK · Founder/CEO/CRO/VP Sales/Sales Director/Head of Sales ·
--     software/SaaS · director+.
--
--     ⚠️ TERMINOLOGY IS EXACT ON PURPOSE. The final column is
--     `after_sql_visible_runtime_gates` — NOT "runtime servable" — because two runtime
--     gates CANNOT be reproduced in SQL and are stated rather than hidden:
--       · isSuppressed() also reads the SUPPRESSED_DOMAINS env var — additions there are
--         invisible to SQL; only the hard-coded floor is reproduced below;
--       · the runtime candidate window (limit 100) and its storage-order effects.
--     Client dedupe: edit `params` with the fresh client's uuid. Left NULL, the dedupe
--     gate is applied with an empty owned-set — for a genuinely FRESH client that is the
--     true value (they own nothing), stated here rather than silently omitted.
with params as (
  select null::uuid as client_id     -- ← edit to the Pass-1 client's id, or leave NULL (fresh client)
), canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
), sup as (
  -- the DNC floor, decoded in SQL so the employer name stays out of plaintext (mirrors
  -- suppression.ts — the env additions are NOT reproducible here, see the caveat above)
  select lower(convert_from(decode(x, 'base64'), 'UTF8')) as d
  from unnest(array['c21hcnRzaGVldC5jb20=','YnJhbmRmb2xkZXIuY29t','b3V0Zml0Lmlv','c2xvcGVhcHAuY29t']) x
), universe as (
  -- pool rows + provider-proven K.I.N.D-acquired leads (the promotable set), one row per email
  select p.email_norm, lower(btrim(coalesce(p.country,''))) as raw_country,
         p.title, p.industry, p.seniority, p.company, p.linkedin_url
  from public.lead_pool p
  union
  select distinct on (lower(btrim(l.email)))
         lower(btrim(l.email)), lower(btrim(coalesce(l.country,''))),
         l.job_title, l.industry, l.seniority, l.company, l.linkedin_url
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
      or exists (select 1 from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email))
                    and lower(btrim(am.source)) in ('pdl','apollo')))
  order by lower(btrim(l.email))
), gated as (
  select u.*,
         coalesce((select c.canonical from canon c where c.alias = u.raw_country),
                  nullif(u.raw_country,''))                                        as canon_country,
         (lower(coalesce(u.title,'')) similar to
            '%(founder|ceo|chief executive|cro|chief revenue|vp sales|vp of sales|sales director|director of sales|head of sales)%'
          or lower(coalesce(u.industry,'')) similar to '%(software|saas)%'
          or lower(coalesce(u.seniority,'')) similar to '%(director|vp|c_suite|c-suite|owner|founder|head|chief)%') as role_ok,
         not exists (select 1 from public.opt_out_blocklist b
                      where lower(btrim(b.email)) = u.email_norm
                        and b.opted_back_in_at is null)                            as blocklist_ok,
         not exists (select 1 from sup
                      where split_part(u.email_norm,'@',2) = sup.d
                         or split_part(u.email_norm,'@',2) like '%.'||sup.d
                         or lower(coalesce(u.company,'')||' '||coalesce(u.linkedin_url,'')) like '%'||sup.d||'%'
                         or lower(coalesce(u.company,'')||' '||coalesce(u.linkedin_url,'')) like '%'||split_part(sup.d,'.',1)||'%') as suppression_floor_ok,
         not exists (select 1 from params pr, public.leads own
                      where pr.client_id is not null
                        and own.client_id = pr.client_id
                        and lower(btrim(own.email)) = u.email_norm)                as dedupe_ok
  from universe u
)
select count(*)                                                                    as kind_acquired_proven,
       count(*) filter (where canon_country in ('united states','united kingdom'))  as canonical_geo_match,
       count(*) filter (where canon_country in ('united states','united kingdom')
                          and role_ok)                                             as role_match,
       count(*) filter (where canon_country in ('united states','united kingdom')
                          and role_ok and blocklist_ok)                            as after_opt_out_blocklist,
       count(*) filter (where canon_country in ('united states','united kingdom')
                          and role_ok and blocklist_ok and suppression_floor_ok)   as after_sql_visible_suppression_floor,
       count(*) filter (where canon_country in ('united states','united kingdom')
                          and role_ok and blocklist_ok and suppression_floor_ok
                          and dedupe_ok)                                           as after_existing_client_dedupe,
       count(*) filter (where canon_country in ('united states','united kingdom')
                          and role_ok and blocklist_ok and suppression_floor_ok
                          and dedupe_ok)                                           as after_sql_visible_runtime_gates
from gated;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — THE PROMOTION. FOUNDER-CONTROLLED ONLY. DO NOT RUN UNREAD.      │
-- │ Deterministic provider (NO LIMIT 1) · provider IN ('pdl','apollo') or     │
-- │ skipped · original cost or skipped · customer/inbound excluded by         │
-- │ construction · unknown/ambiguous fail closed · ON CONFLICT DO NOTHING ·   │
-- │ fill-only heal · one transaction · idempotent.                            │
-- └──────────────────────────────────────────────────────────────────────────┘
begin;

with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), cand as (
  select distinct on (lower(btrim(l.email)))
         lower(btrim(l.email))                                    as email_norm,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company, l.industry,
         l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)),''))              as canon_country,
         case
           when lower(coalesce(l.source,'')) in ('pdl','apollo') then lower(l.source)
           when lower(coalesce(l.source,'')) = 'lookalike' then 'pdl'
           when exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                         where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
             then 'apollo'
           else (select case when count(distinct lower(btrim(am.source))) = 1
                             then min(lower(btrim(am.source))) end
                   from public.acquisition_memory am
                  where am.email_norm = lower(btrim(l.email))
                    and lower(btrim(am.source)) in ('pdl','apollo'))
         end                                                       as provider,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    -- customer/inbound EXCLUDED BY CONSTRUCTION; the tag always wins:
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
  order by lower(btrim(l.email)), l.created_at asc
), costed as (
  select cand.*,
         case
           when (select min(am.acquisition_cost_usd) from public.acquisition_memory am
                  where am.email_norm = cand.email_norm
                    and lower(btrim(am.source)) = cand.provider) is not null
             then (select min(am.acquisition_cost_usd) from public.acquisition_memory am
                    where am.email_norm = cand.email_norm
                      and lower(btrim(am.source)) = cand.provider)   -- ① original recorded cost
           when cand.provider = 'apollo' and cand.is_house then 0    -- ② proven owned book
           else null                                                 -- ③ unprovable → skipped
         end as resolved_cost
  from cand
)
insert into public.lead_pool
  (email_norm, first_name, last_name, title, seniority, company, industry,
   company_size, country, linkedin_url, source, acquisition_cost, sourced_at)
select p.email_norm, p.first_name, p.last_name, p.job_title, p.seniority, p.company,
       p.industry, p.company_size,
       p.canon_country,                     -- canonical or NULL; NULL rows pool but are geo-unservable
       p.linkedin_url,
       p.provider,
       p.resolved_cost,
       p.created_at
from costed p
where p.provider in ('pdl', 'apollo')       -- resolver failed → EXCLUDED, fail closed
  and p.resolved_cost is not null           -- cost unprovable → EXCLUDED, never fabricated
on conflict (email_norm) do nothing;        -- never overwrites an existing pooled record

-- Fill-only country heal — the SAME rights boundary as the insert: only rows whose
-- provider RESOLVES may contribute a country, so a customer/inbound row sharing an
-- email with a pooled identity can never supply the geography (red-proof E).
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
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
    and (lower(coalesce(l.source,'')) in ('pdl','apollo')
      or lower(coalesce(l.source,'')) = 'lookalike'
      or exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
      or (select case when count(distinct lower(btrim(am.source))) = 1 then 1 end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and lower(btrim(am.source)) in ('pdl','apollo')) = 1)
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
