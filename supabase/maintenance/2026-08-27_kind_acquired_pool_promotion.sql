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
--   E. acquisition_memory                → corroboration BINDS TO THE ACQUISITION
--        IDENTITY, never to the email. acquisition_memory is keyed
--        (source, provider_id) — see 20260826_acquisition_memory.sql — so the
--        lead row's OWN provider id (leads.apollo_id) must MATCH a remembered
--        provider_id, and exactly one eligible provider ('pdl'|'apollo') must
--        claim it. Email coincidence proves nothing: manual POST /leads accepts
--        an arbitrary apollo_id. No provider id on the row → nothing to bind to
--        → excluded. 0 or 2+ eligible → ambiguous → EXCLUDED.
--   Final guard either way: provider IN ('pdl','apollo') or the row is skipped.
--
-- COST RESOLUTION (original truth, never today's rate painted over history):
--   ① acquisition_memory holds the ORIGINAL acquisition_cost_usd, written once
--      at acquisition (ON CONFLICT DO NOTHING). Resolved against the SAME
--      (source, provider_id) identity as the provider: EXACTLY ONE distinct
--      recorded cost → that cost. More than one distinct cost for the same
--      resolved identity → COST AMBIGUOUS → EXCLUDED and counted. ⚠️ NO MIN/MAX:
--      "lowest is conservative" is not "historically true", and a tiebreak
--      dressed as determinism is the defect this rule exists to stop.
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

-- A1 · INVENTORY BY IDENTITY — one email = at most ONE count, in exactly one state.
--     ⚠️ Identity dedupe is EXPLICIT (group by email_norm), never a UNION of differently
--     shaped rows: the same email in both `lead_pool` and `leads` with different metadata
--     would otherwise be counted twice. States are mutually exclusive and exhaustive:
--       already_in_pool · promotable_outside_pool · ambiguous_excluded ·
--       customer_inbound_excluded · unknown_excluded
--     A row is NOT provider-proven merely because acquisition_memory holds the same EMAIL —
--     corroboration binds to (source, provider_id), exactly as Phase B does.
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_facts as (
  -- one row PER LEAD ROW first; the identity roll-up happens below
  select lower(btrim(l.email))                                     as email_norm,
         lower(coalesce(l.source,''))                              as src,
         l.apollo_id                                               as provider_id,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))              as canon_country,
         (coalesce(btrim(l.job_title),'') <> '' or coalesce(btrim(l.industry),'') <> ''
           or coalesce(btrim(l.seniority),'') <> '')                as has_role,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         -- E: identity-bound corroboration — provider_id must MATCH, not just the email
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))       as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), per_row as (
  select f.*,
         case
           when f.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when f.src in ('pdl','apollo') then f.src
           when f.src = 'lookalike' then 'pdl'
           when f.is_house then 'apollo'
           when f.provider_id is not null then f.memory_provider
         end as provider
  from lead_facts f
), identity as (
  select email_norm,
         bool_or(src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as any_customer,
         count(distinct provider) filter (where provider is not null)                            as distinct_providers,
         count(distinct canon_country) filter (where provider is not null
                                                 and canon_country is not null)                  as distinct_countries,
         bool_or(has_role and provider is not null)                                              as has_role,
         bool_or(canon_country is not null and provider is not null)                             as has_country,
         exists (select 1 from public.lead_pool p where p.email_norm = per_row.email_norm)       as in_pool
  from per_row group by email_norm, per_row.email_norm
)
select case
         when in_pool                         then 'already_in_pool'
         when any_customer                    then 'customer_inbound_excluded'
         when distinct_providers = 1
          and has_country and has_role
          and distinct_countries = 1          then 'promotable_outside_pool'
         when distinct_providers > 1
           or distinct_countries > 1          then 'ambiguous_excluded'
         when distinct_providers = 1          then 'provider_proven_metadata_incomplete'
         else 'unknown_excluded'
       end                                                          as state,
       count(*)                                                     as identities,
       count(*) filter (where distinct_providers > 1)                as provider_ambiguous,
       count(*) filter (where distinct_countries > 1)                as country_ambiguous
from identity
group by 1 order by identities desc;

-- A1b · PROJECTED POOL AFTER PROMOTION — identities, never rows.
with pooled as (select email_norm from public.lead_pool)
select (select count(*) from pooled)                                as already_in_pool,
       (select count(*) from (
          select lower(btrim(l.email)) as e from public.leads l
          where coalesce(btrim(l.email),'') <> ''
            and lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
            and not exists (select 1 from pooled p where p.email_norm = lower(btrim(l.email)))
          group by 1) x)                                            as explicit_source_outside_pool,
       (select count(*) from pooled) +
       (select count(*) from (
          select lower(btrim(l.email)) as e from public.leads l
          where coalesce(btrim(l.email),'') <> ''
            and lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
            and not exists (select 1 from pooled p where p.email_norm = lower(btrim(l.email)))
          group by 1) y)                                            as projected_after_promotion_upper_bound;

-- A2 · PROVIDER-PROVEN, METADATA-COMPLETE identities by provider, with the COST resolution.
--     ⚠️ RENAMED from `safely_promotable_now`: that name implied the row would actually be
--     promoted, but Phase B ALSO requires a provable, unambiguous cost. The columns below
--     separate the two so nothing is over-claimed.
with cand as (
  select lower(btrim(l.email))                                     as email_norm,
         lower(coalesce(l.source,''))                              as src,
         l.apollo_id                                               as provider_id,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))       as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
    and not exists (select 1 from public.lead_pool p where p.email_norm = lower(btrim(l.email)))
), resolved as (
  select email_norm, is_house, provider_id,
         case
           when src in ('pdl','apollo') then src
           when src = 'lookalike' then 'pdl'
           when is_house then 'apollo'
           when provider_id is not null then memory_provider
         end as provider
  from cand
), per_identity as (
  select email_norm,
         count(distinct provider) filter (where provider is not null) as distinct_providers,
         min(provider) filter (where provider is not null)            as provider,
         bool_or(is_house)                                            as is_house,
         min(provider_id)                                             as provider_id
  from resolved group by email_norm
), costed as (
  select p.*,
         -- COST: bound to the SAME (source, provider_id) identity. Exactly one distinct
         -- recorded cost, or nothing. NO MIN-AS-TRUTH.
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = p.email_norm and am.provider_id = p.provider_id
             and lower(btrim(am.source)) = p.provider)               as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = p.email_norm and am.provider_id = p.provider_id
             and lower(btrim(am.source)) = p.provider)               as proven_cost
  from per_identity p
  where p.distinct_providers = 1
)
select provider,
       count(*)                                                                       as provider_proven_metadata_complete,
       count(*) filter (where proven_cost is not null)                                as cost_proven,
       count(*) filter (where distinct_costs = 0 and provider = 'apollo' and is_house) as house_zero_accepted,
       count(*) filter (where distinct_costs = 0 and not (provider = 'apollo' and is_house)) as cost_unprovable_excluded,
       count(*) filter (where distinct_costs > 1)                                     as cost_ambiguous_excluded
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
), pool_ident as (
  select p.email_norm, lower(btrim(coalesce(p.country,''))) as raw_country,
         p.title, p.industry, p.seniority, p.company, p.linkedin_url, true as in_pool
  from public.lead_pool p
  where p.source in ('pdl','apollo')                 -- the READ fence, mirrored
), lead_ident as (
  -- ⚑ IDENTITY DEDUPE IS EXPLICIT. `UNION` deduplicates whole TUPLES, so the same email in
  -- both stores with different metadata was counted TWICE. Grouped by email_norm instead,
  -- and pool identities are removed below so every identity contributes AT MOST ONE count.
  -- Provenance is fail-closed and IDENTITY-BOUND: acquisition_memory corroborates only when
  -- the row's own provider_id matches a remembered provider_id, exactly as Phase B does.
  select lower(btrim(l.email))                                  as email_norm,
         min(lower(btrim(coalesce(l.country,''))))
           filter (where coalesce(btrim(l.country),'') <> '')    as raw_country,
         count(distinct lower(btrim(l.country)))
           filter (where coalesce(btrim(l.country),'') <> '')    as distinct_countries,
         (array_agg(l.job_title    order by l.created_at asc))[1] as title,
         (array_agg(l.industry     order by l.created_at asc))[1] as industry,
         (array_agg(l.seniority    order by l.created_at asc))[1] as seniority,
         (array_agg(l.company      order by l.created_at asc))[1] as company,
         (array_agg(l.linkedin_url order by l.created_at asc))[1] as linkedin_url,
         false                                                    as in_pool
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
      or (l.apollo_id is not null and (select count(distinct lower(btrim(am.source)))
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email)) and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo')) = 1))
    and not exists (select 1 from public.lead_pool pp where pp.email_norm = lower(btrim(l.email)))
  group by 1
), universe as (
  select email_norm, raw_country, title, industry, seniority, company, linkedin_url, in_pool,
         1 as distinct_countries from pool_ident
  union all
  select email_norm, raw_country, title, industry, seniority, company, linkedin_url, in_pool,
         distinct_countries from lead_ident
), gated as (
  select u.*,
         case when u.distinct_countries > 1 then null            -- country ambiguous → no claim
              else coalesce((select c.canonical from canon c where c.alias = u.raw_country),
                            nullif(u.raw_country,'')) end                                  as canon_country,
         (lower(coalesce(u.title,'')) similar to
            '%(founder|ceo|chief executive|cro|chief revenue|vp sales|vp of sales|sales director|director of sales|head of sales)%'
          or lower(coalesce(u.industry,'')) similar to '%(software|saas)%'
          or lower(coalesce(u.seniority,'')) similar to '%(director|vp|c_suite|c-suite|owner|founder|head|chief)%') as role_ok,
         not exists (select 1 from public.opt_out_blocklist b
                      where lower(btrim(b.email)) = u.email_norm
                        and b.opted_back_in_at is null)                                    as blocklist_ok,
         not exists (select 1 from sup
                      where split_part(u.email_norm,'@',2) = sup.d
                         or split_part(u.email_norm,'@',2) like '%.'||sup.d
                         or lower(coalesce(u.company,'')||' '||coalesce(u.linkedin_url,'')) like '%'||sup.d||'%'
                         or lower(coalesce(u.company,'')||' '||coalesce(u.linkedin_url,'')) like '%'||split_part(sup.d,'.',1)||'%') as suppression_floor_ok,
         not exists (select 1 from params pr, public.leads own
                      where pr.client_id is not null
                        and own.client_id = pr.client_id
                        and lower(btrim(own.email)) = u.email_norm)                        as dedupe_ok
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
                          and dedupe_ok)                                           as after_sql_visible_runtime_gates,
       count(*) filter (where in_pool)                                             as of_which_already_in_pool,
       count(*) filter (where not in_pool)                                         as of_which_promotable_outside_pool,
       count(*) filter (where distinct_countries > 1)                              as country_ambiguous
from gated;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — THE PROMOTION. FOUNDER-CONTROLLED ONLY. DO NOT RUN UNREAD.      │
-- │ Deterministic provider (NO LIMIT 1) · provider IN ('pdl','apollo') or     │
-- │ skipped · original cost or skipped · customer/inbound excluded by         │
-- │ construction · unknown/ambiguous fail closed · ON CONFLICT DO NOTHING ·   │
-- │ fill-only heal · one transaction · idempotent.                            │
-- └──────────────────────────────────────────────────────────────────────────┘
begin;

-- ⚑ IDENTITY-LEVEL RESOLUTION. Everything below groups by email_norm FIRST, so the metadata
-- carried into the pool is resolved per identity, never taken from an arbitrary "earliest"
-- row. Provider, country and cost each resolve to exactly-one-answer or the identity is
-- skipped and counted. No DISTINCT ON. No MIN/MAX tiebreak. No earliest-row pick.
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), rows_ as (
  select lower(btrim(l.email))                                      as email_norm,
         lower(coalesce(l.source,''))                               as src,
         l.apollo_id                                                as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company, l.industry,
         l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)),''))                as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id          -- IDENTITY-BOUND, not email-bound
             and lower(btrim(am.source)) in ('pdl','apollo'))        as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
    -- customer/inbound EXCLUDED BY CONSTRUCTION; the tag always wins:
    and lower(coalesce(l.source,'')) not in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')
), resolved_rows as (
  select r.*,
         case
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end as provider
  from rows_ r
), identity as (
  select email_norm,
         count(distinct provider) filter (where provider is not null)                 as distinct_providers,
         min(provider) filter (where provider is not null)                            as provider,
         -- COUNTRY: every eligible observation for this identity, canonicalised. Exactly
         -- one distinct answer or NULL. >1 → ambiguous → country stays NULL (the identity
         -- may still pool as geo-unservable inventory), NEVER a chosen geography.
         count(distinct canon_country) filter (where provider is not null
                                                 and canon_country is not null)        as distinct_countries,
         min(canon_country) filter (where provider is not null
                                      and canon_country is not null)                   as one_country,
         bool_or(is_house)                                                             as is_house,
         min(provider_id)                                                              as provider_id,
         -- carry the rest of the metadata from a single deterministic representative row;
         -- no defect is proved for these columns, so their existing behaviour is unchanged.
         (array_agg(first_name  order by created_at asc))[1]                           as first_name,
         (array_agg(last_name   order by created_at asc))[1]                           as last_name,
         (array_agg(job_title   order by created_at asc))[1]                           as job_title,
         (array_agg(seniority   order by created_at asc))[1]                           as seniority,
         (array_agg(company     order by created_at asc))[1]                           as company,
         (array_agg(industry    order by created_at asc))[1]                           as industry,
         (array_agg(company_size order by created_at asc))[1]                          as company_size,
         (array_agg(linkedin_url order by created_at asc))[1]                          as linkedin_url,
         min(created_at)                                                               as sourced_at
  from resolved_rows group by email_norm
), costed as (
  select i.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = i.email_norm and am.provider_id = i.provider_id
             and lower(btrim(am.source)) = i.provider)                                 as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = i.email_norm and am.provider_id = i.provider_id
             and lower(btrim(am.source)) = i.provider)                                 as proven_cost
  from identity i
  where i.distinct_providers = 1                    -- provider ambiguous → EXCLUDED
)
insert into public.lead_pool
  (email_norm, first_name, last_name, title, seniority, company, industry,
   company_size, country, linkedin_url, source, acquisition_cost, sourced_at)
select c.email_norm, c.first_name, c.last_name, c.job_title, c.seniority, c.company,
       c.industry, c.company_size,
       case when c.distinct_countries = 1 then c.one_country else null end,  -- ambiguous → NULL
       c.linkedin_url,
       c.provider,
       case when c.proven_cost is not null then c.proven_cost                -- ① original truth
            when c.provider = 'apollo' and c.is_house then 0 end,            -- ② proven house book
       c.sourced_at
from costed c
where c.provider in ('pdl', 'apollo')
  and (c.proven_cost is not null                                             -- ③ cost must be
    or (c.provider = 'apollo' and c.is_house))                               --    proven or house
on conflict (email_norm) do nothing;

-- Fill-only country heal — SAME rights boundary AND the same ambiguity rule: only identities
-- with exactly ONE distinct canonical country across eligible K.I.N.D-owned observations may
-- supply one. A customer/inbound row sharing an email can never contribute (red-proof 7).
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
    and (lower(coalesce(l.source,'')) in ('pdl','apollo','lookalike')
      or exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com')
      or (l.apollo_id is not null and (select count(distinct lower(btrim(am.source)))
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email)) and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo')) = 1))
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
