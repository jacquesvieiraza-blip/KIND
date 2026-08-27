-- ============================================================================
-- K.I.N.D-ACQUIRED INVENTORY → SHARED POOL PROMOTION (R73, 27 Aug)
-- ⛓️ FINAL RESOLVER-ALIGNMENT PASS, 27 Aug: PHASE A is now a DRY-RUN MODEL OF
--    PHASE B. One canonical resolver, mirrored verbatim in A1/A1b/A2/A3 and B.
--
-- ⚠️ MAINTENANCE SQL, NOT A MIGRATION — BY CONSTRUCTION IT CANNOT AUTO-RUN.
-- No PENDING_MIGRATIONS entry (a test fails if one appears); it runs only when
-- the founder pastes it into the SQL editor, having read PHASE A first.
--
-- THE RULE — founder ruling R73, verbatim:
--   "all client data we own. including apollo data can be used as a source for
--    clients too. it is data we own."
--
-- ═══ THE CANONICAL ACQUISITION IDENTITY ═══════════════════════════════════
-- The atomic owned thing is NOT an email. It is:
--
--        (provider, provider_id)          ← when a provider id is known
--        (provider, 'house:'||email)      ← the house book, whose rows predate
--                                           provider-id capture; the house
--                                           account IS the acquisition record
--
-- One email may carry SEVERAL acquisitions (PDL/A and PDL/B are two purchases
-- of the same person). `distinct provider = 1` does NOT mean one acquisition.
-- ⚠️ NO min(provider_id), NO max(provider_id), NO arbitrary identity choice:
-- an email with 2+ provable acquisition identities is
-- `acquisition_identity_ambiguous` and FAILS CLOSED.
--
-- ═══ PROVIDER RESOLUTION (per ROW, then rolled up per identity) ════════════
--   A. customer/inbound tag              → contributes NOTHING, ever
--   B. leads.source = 'pdl' | 'apollo'   → that exact provider
--   C. leads.source = 'lookalike'        → 'pdl' (route calls pdlSearchPeople)
--   D. house account                     → 'apollo' (the founder's own book)
--   E. acquisition_memory                → binds to (source, provider_id): the
--        row's OWN apollo_id must MATCH a remembered provider_id and exactly
--        one eligible provider must claim it. Email coincidence proves nothing
--        (manual POST /leads accepts an arbitrary apollo_id). No provider id →
--        nothing to bind to → unresolved.
--   otherwise → UNRESOLVED. Unresolved rows contribute NO metadata, NO country,
--   NO cost — they are invisible to promotion, not merely unpromotable.
--
-- ═══ COST STATE MACHINE (evidence beats the default, always) ═══════════════
--   distinct recorded costs = 1                    → that cost         (proven)
--   = 0 AND the identity is the proven house book  → 0             (house_zero)
--   = 0 otherwise                                  → cost_unprovable → EXCLUDE
--   > 1                                            → cost_ambiguous  → EXCLUDE
--                                                     ⚠️ INCLUDING house Apollo
--
-- ═══ COUNTRY STATE MACHINE (canonicalise FIRST, then count distinct) ═══════
--   Each observation is canonicalised BEFORE distinctness, so GB + England +
--   United Kingdom is ONE country, not three.
--   1 distinct canonical → that country
--   0                    → NULL (poolable, geo-unservable) — not ambiguous
--   > 1                  → country_ambiguous → country NULL, never a choice
--
-- ═══ METADATA PROVENANCE ══════════════════════════════════════════════════
-- Every column written into the shared pool comes ONLY from rows of the SAME
-- proven acquisition identity. An unresolved or customer row sharing the email
-- contributes nothing — not a name, not a title, not a company.
--
-- WHAT PHASE B NEVER DOES: no provider call · no spend · no inferred geography ·
-- never overwrites an existing pooled record (ON CONFLICT DO NOTHING) · the
-- heal stays NULL-only and rights-bounded · idempotent.
--
-- The country alias CASE mirrors packages/shared/src/launch-countries.ts —
-- regenerate both together, never edit one alone.
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ THE CANONICAL RESOLVER — this exact block opens A1, A1b, A2, A3 and B.   │
-- │ It is repeated verbatim rather than shared, because each statement must  │
-- │ be pasteable alone; a structural test asserts the copies stay identical. │
-- └──────────────────────────────────────────────────────────────────────────┘

-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — DRY RUN. READ ONLY. Counts only, no PII. Run ALL of it first. │
-- └────────────────────────────────────────────────────────────────────────┘

-- A1
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_rows as (
  select l.id                                                          as lead_id,
         lower(btrim(l.email))                                         as email_norm,
         lower(coalesce(l.source,''))                                  as src,
         l.apollo_id                                                   as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company,
         l.industry, l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))                  as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))            as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), resolved_rows as (
  select r.*,
         case
           when r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end                                                            as provider,
         (r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as is_customer_row
  from lead_rows r
), owned_rows as (
  select rr.*,
         case when rr.provider_id is not null then rr.provider || ':' || rr.provider_id
              when rr.is_house then rr.provider || ':house:' || rr.email_norm
         end                                                            as acquisition_key
  from resolved_rows rr
  where rr.provider in ('pdl','apollo')
    and not rr.is_customer_row
    and (rr.provider_id is not null or rr.is_house)
), acquisition as (
  -- ⚠️ provider and provider_id are CONSTANT inside one acquisition_key (the key is built
  -- from them), so they are GROUPED BY, never aggregated. An aggregate here would read as a
  -- choice — and a choice is exactly what this pass exists to remove.
  select acquisition_key, email_norm, provider, provider_id,
         bool_or(is_house)                                              as is_house,
         count(distinct canon_country) filter (where canon_country is not null) as distinct_countries,
         min(canon_country) filter (where canon_country is not null)     as one_country,
         bool_or(coalesce(btrim(job_title),'') <> '' or coalesce(btrim(industry),'') <> ''
              or coalesce(btrim(seniority),'') <> '')                    as has_role,
         (array_agg(first_name   order by created_at asc, lead_id asc))[1] as first_name,
         (array_agg(last_name    order by created_at asc, lead_id asc))[1] as last_name,
         (array_agg(job_title    order by created_at asc, lead_id asc))[1] as job_title,
         (array_agg(seniority    order by created_at asc, lead_id asc))[1] as seniority,
         (array_agg(company      order by created_at asc, lead_id asc))[1] as company,
         (array_agg(industry     order by created_at asc, lead_id asc))[1] as industry,
         (array_agg(company_size order by created_at asc, lead_id asc))[1] as company_size,
         (array_agg(linkedin_url order by created_at asc, lead_id asc))[1] as linkedin_url,
         min(created_at)                                                 as sourced_at
  from owned_rows
  group by acquisition_key, email_norm, provider, provider_id
), costed as (
  select a.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as proven_cost
  from acquisition a
), classified as (
  select c.*,
         (c.distinct_costs > 1)                                          as cost_ambiguous,
         (c.distinct_costs = 0 and not (c.provider = 'apollo' and c.is_house)) as cost_unprovable,
         case when c.proven_cost is not null then c.proven_cost
              when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0 end as resolved_cost,
         (c.distinct_countries > 1)                                      as country_ambiguous,
         case when c.distinct_countries = 1 then c.one_country end        as resolved_country,
         exists (select 1 from public.lead_pool p where p.email_norm = c.email_norm) as already_pooled
  from costed c
), identity_state as (
  select email_norm,
         count(*)                                                        as acquisition_identities,
         bool_or(already_pooled)                                         as already_pooled,
         bool_or(has_role)                                               as has_role,
         bool_or(country_ambiguous)                                      as country_ambiguous,
         bool_or(cost_ambiguous)                                         as cost_ambiguous,
         bool_or(cost_unprovable)                                        as cost_unprovable,
         min(acquisition_key)                                            as only_key
  from classified group by email_norm
), executable as (
  -- THE EXECUTION SET. Phase B inserts exactly these; Phase A counts exactly these.
  select cl.*
  from classified cl
  join identity_state st on st.email_norm = cl.email_norm
  where st.acquisition_identities = 1        -- 2+ owned acquisitions → fail closed
    and not cl.already_pooled
    and cl.has_role
    and not cl.cost_ambiguous                -- ⚠️ ambiguity beats the house-zero default
    and not cl.cost_unprovable
    and cl.resolved_cost is not null
)
-- ── A1 · IDENTITY STATES. One email = ONE row here. States are derived from the
--        acquisition classification above, so a CUSTOMER row sharing the email cannot
--        erase a separately proven owned acquisition — it simply contributed nothing.
select case
         when st.already_pooled                     then 'already_in_pool'
         when st.acquisition_identities = 0         then 'no_owned_acquisition_excluded'
         when st.acquisition_identities > 1         then 'acquisition_identity_ambiguous'
         when st.cost_ambiguous                     then 'cost_ambiguous'
         when st.cost_unprovable                    then 'cost_unprovable'
         when not st.has_role                       then 'metadata_incomplete'
         else                                            'executable_promotion'
       end                                                                as state,
       count(*)                                                           as identities,
       count(*) filter (where st.country_ambiguous)                        as of_which_country_ambiguous
from (
  select coalesce(s.email_norm, x.email_norm) as email_norm,
         coalesce(s.acquisition_identities, 0) as acquisition_identities,
         coalesce(s.already_pooled, x.pooled)  as already_pooled,
         coalesce(s.has_role, false)           as has_role,
         coalesce(s.country_ambiguous, false)  as country_ambiguous,
         coalesce(s.cost_ambiguous, false)     as cost_ambiguous,
         coalesce(s.cost_unprovable, false)    as cost_unprovable
  from identity_state s
  full outer join (
    -- every email that exists at all, so customer-only / unknown-only identities are counted
    select lower(btrim(l.email)) as email_norm,
           exists (select 1 from public.lead_pool p where p.email_norm = lower(btrim(l.email))) as pooled
    from public.leads l where coalesce(btrim(l.email),'') <> '' group by 1
  ) x on x.email_norm = s.email_norm
) st
group by 1 order by identities desc;

-- A1b
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_rows as (
  select l.id                                                          as lead_id,
         lower(btrim(l.email))                                         as email_norm,
         lower(coalesce(l.source,''))                                  as src,
         l.apollo_id                                                   as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company,
         l.industry, l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))                  as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))            as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), resolved_rows as (
  select r.*,
         case
           when r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end                                                            as provider,
         (r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as is_customer_row
  from lead_rows r
), owned_rows as (
  select rr.*,
         case when rr.provider_id is not null then rr.provider || ':' || rr.provider_id
              when rr.is_house then rr.provider || ':house:' || rr.email_norm
         end                                                            as acquisition_key
  from resolved_rows rr
  where rr.provider in ('pdl','apollo')
    and not rr.is_customer_row
    and (rr.provider_id is not null or rr.is_house)
), acquisition as (
  -- ⚠️ provider and provider_id are CONSTANT inside one acquisition_key (the key is built
  -- from them), so they are GROUPED BY, never aggregated. An aggregate here would read as a
  -- choice — and a choice is exactly what this pass exists to remove.
  select acquisition_key, email_norm, provider, provider_id,
         bool_or(is_house)                                              as is_house,
         count(distinct canon_country) filter (where canon_country is not null) as distinct_countries,
         min(canon_country) filter (where canon_country is not null)     as one_country,
         bool_or(coalesce(btrim(job_title),'') <> '' or coalesce(btrim(industry),'') <> ''
              or coalesce(btrim(seniority),'') <> '')                    as has_role,
         (array_agg(first_name   order by created_at asc, lead_id asc))[1] as first_name,
         (array_agg(last_name    order by created_at asc, lead_id asc))[1] as last_name,
         (array_agg(job_title    order by created_at asc, lead_id asc))[1] as job_title,
         (array_agg(seniority    order by created_at asc, lead_id asc))[1] as seniority,
         (array_agg(company      order by created_at asc, lead_id asc))[1] as company,
         (array_agg(industry     order by created_at asc, lead_id asc))[1] as industry,
         (array_agg(company_size order by created_at asc, lead_id asc))[1] as company_size,
         (array_agg(linkedin_url order by created_at asc, lead_id asc))[1] as linkedin_url,
         min(created_at)                                                 as sourced_at
  from owned_rows
  group by acquisition_key, email_norm, provider, provider_id
), costed as (
  select a.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as proven_cost
  from acquisition a
), classified as (
  select c.*,
         (c.distinct_costs > 1)                                          as cost_ambiguous,
         (c.distinct_costs = 0 and not (c.provider = 'apollo' and c.is_house)) as cost_unprovable,
         case when c.proven_cost is not null then c.proven_cost
              when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0 end as resolved_cost,
         (c.distinct_countries > 1)                                      as country_ambiguous,
         case when c.distinct_countries = 1 then c.one_country end        as resolved_country,
         exists (select 1 from public.lead_pool p where p.email_norm = c.email_norm) as already_pooled
  from costed c
), identity_state as (
  select email_norm,
         count(*)                                                        as acquisition_identities,
         bool_or(already_pooled)                                         as already_pooled,
         bool_or(has_role)                                               as has_role,
         bool_or(country_ambiguous)                                      as country_ambiguous,
         bool_or(cost_ambiguous)                                         as cost_ambiguous,
         bool_or(cost_unprovable)                                        as cost_unprovable,
         min(acquisition_key)                                            as only_key
  from classified group by email_norm
), executable as (
  -- THE EXECUTION SET. Phase B inserts exactly these; Phase A counts exactly these.
  select cl.*
  from classified cl
  join identity_state st on st.email_norm = cl.email_norm
  where st.acquisition_identities = 1        -- 2+ owned acquisitions → fail closed
    and not cl.already_pooled
    and cl.has_role
    and not cl.cost_ambiguous                -- ⚠️ ambiguity beats the house-zero default
    and not cl.cost_unprovable
    and cl.resolved_cost is not null
)
-- ── A1b · EXACT PROJECTED COUNTS. No "upper bound" label — every number below is the
--         resolver's own execution set, so Phase B attempts exactly `executable_promotion_identities`.
select (select count(*) from public.lead_pool
         where source in ('pdl','apollo'))                                as current_eligible_pool_identities,
       (select count(*) from public.lead_pool)                            as current_pool_rows_all_sources,
       (select count(*) from executable)                                  as executable_promotion_identities,
       (select count(*) from public.lead_pool where source in ('pdl','apollo'))
         + (select count(*) from executable)                              as projected_pool_after_phase_b;

-- A2
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_rows as (
  select l.id                                                          as lead_id,
         lower(btrim(l.email))                                         as email_norm,
         lower(coalesce(l.source,''))                                  as src,
         l.apollo_id                                                   as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company,
         l.industry, l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))                  as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))            as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), resolved_rows as (
  select r.*,
         case
           when r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end                                                            as provider,
         (r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as is_customer_row
  from lead_rows r
), owned_rows as (
  select rr.*,
         case when rr.provider_id is not null then rr.provider || ':' || rr.provider_id
              when rr.is_house then rr.provider || ':house:' || rr.email_norm
         end                                                            as acquisition_key
  from resolved_rows rr
  where rr.provider in ('pdl','apollo')
    and not rr.is_customer_row
    and (rr.provider_id is not null or rr.is_house)
), acquisition as (
  -- ⚠️ provider and provider_id are CONSTANT inside one acquisition_key (the key is built
  -- from them), so they are GROUPED BY, never aggregated. An aggregate here would read as a
  -- choice — and a choice is exactly what this pass exists to remove.
  select acquisition_key, email_norm, provider, provider_id,
         bool_or(is_house)                                              as is_house,
         count(distinct canon_country) filter (where canon_country is not null) as distinct_countries,
         min(canon_country) filter (where canon_country is not null)     as one_country,
         bool_or(coalesce(btrim(job_title),'') <> '' or coalesce(btrim(industry),'') <> ''
              or coalesce(btrim(seniority),'') <> '')                    as has_role,
         (array_agg(first_name   order by created_at asc, lead_id asc))[1] as first_name,
         (array_agg(last_name    order by created_at asc, lead_id asc))[1] as last_name,
         (array_agg(job_title    order by created_at asc, lead_id asc))[1] as job_title,
         (array_agg(seniority    order by created_at asc, lead_id asc))[1] as seniority,
         (array_agg(company      order by created_at asc, lead_id asc))[1] as company,
         (array_agg(industry     order by created_at asc, lead_id asc))[1] as industry,
         (array_agg(company_size order by created_at asc, lead_id asc))[1] as company_size,
         (array_agg(linkedin_url order by created_at asc, lead_id asc))[1] as linkedin_url,
         min(created_at)                                                 as sourced_at
  from owned_rows
  group by acquisition_key, email_norm, provider, provider_id
), costed as (
  select a.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as proven_cost
  from acquisition a
), classified as (
  select c.*,
         (c.distinct_costs > 1)                                          as cost_ambiguous,
         (c.distinct_costs = 0 and not (c.provider = 'apollo' and c.is_house)) as cost_unprovable,
         case when c.proven_cost is not null then c.proven_cost
              when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0 end as resolved_cost,
         (c.distinct_countries > 1)                                      as country_ambiguous,
         case when c.distinct_countries = 1 then c.one_country end        as resolved_country,
         exists (select 1 from public.lead_pool p where p.email_norm = c.email_norm) as already_pooled
  from costed c
), identity_state as (
  select email_norm,
         count(*)                                                        as acquisition_identities,
         bool_or(already_pooled)                                         as already_pooled,
         bool_or(has_role)                                               as has_role,
         bool_or(country_ambiguous)                                      as country_ambiguous,
         bool_or(cost_ambiguous)                                         as cost_ambiguous,
         bool_or(cost_unprovable)                                        as cost_unprovable,
         min(acquisition_key)                                            as only_key
  from classified group by email_norm
), executable as (
  -- THE EXECUTION SET. Phase B inserts exactly these; Phase A counts exactly these.
  select cl.*
  from classified cl
  join identity_state st on st.email_norm = cl.email_norm
  where st.acquisition_identities = 1        -- 2+ owned acquisitions → fail closed
    and not cl.already_pooled
    and cl.has_role
    and not cl.cost_ambiguous                -- ⚠️ ambiguity beats the house-zero default
    and not cl.cost_unprovable
    and cl.resolved_cost is not null
)
-- ── A2 · THE FUNNEL TO EXECUTABLE, per provider. Every label means exactly what it filters,
--        and only `executable_promotion` matches Phase B's WHERE.
select cl.provider,
       count(*)                                                                       as acquisition_identity_proven,
       count(*) filter (where cl.has_role)                                            as metadata_complete,
       count(*) filter (where cl.resolved_country is not null)                        as country_single,
       count(*) filter (where cl.distinct_countries = 0)                              as country_missing,
       count(*) filter (where cl.country_ambiguous)                                   as country_ambiguous,
       count(*) filter (where cl.proven_cost is not null)                             as cost_proven,
       count(*) filter (where cl.distinct_costs = 0 and cl.provider = 'apollo' and cl.is_house) as house_zero_accepted,
       count(*) filter (where cl.cost_unprovable)                                     as cost_unprovable,
       count(*) filter (where cl.cost_ambiguous)                                      as cost_ambiguous,
       count(*) filter (where st.acquisition_identities > 1)                          as acquisition_identity_ambiguous,
       count(*) filter (where exists (select 1 from executable e where e.acquisition_key = cl.acquisition_key))
                                                                                      as executable_promotion
from classified cl
join identity_state st on st.email_norm = cl.email_norm
group by cl.provider;

-- A3
with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_rows as (
  select l.id                                                          as lead_id,
         lower(btrim(l.email))                                         as email_norm,
         lower(coalesce(l.source,''))                                  as src,
         l.apollo_id                                                   as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company,
         l.industry, l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))                  as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))            as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), resolved_rows as (
  select r.*,
         case
           when r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end                                                            as provider,
         (r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as is_customer_row
  from lead_rows r
), owned_rows as (
  select rr.*,
         case when rr.provider_id is not null then rr.provider || ':' || rr.provider_id
              when rr.is_house then rr.provider || ':house:' || rr.email_norm
         end                                                            as acquisition_key
  from resolved_rows rr
  where rr.provider in ('pdl','apollo')
    and not rr.is_customer_row
    and (rr.provider_id is not null or rr.is_house)
), acquisition as (
  -- ⚠️ provider and provider_id are CONSTANT inside one acquisition_key (the key is built
  -- from them), so they are GROUPED BY, never aggregated. An aggregate here would read as a
  -- choice — and a choice is exactly what this pass exists to remove.
  select acquisition_key, email_norm, provider, provider_id,
         bool_or(is_house)                                              as is_house,
         count(distinct canon_country) filter (where canon_country is not null) as distinct_countries,
         min(canon_country) filter (where canon_country is not null)     as one_country,
         bool_or(coalesce(btrim(job_title),'') <> '' or coalesce(btrim(industry),'') <> ''
              or coalesce(btrim(seniority),'') <> '')                    as has_role,
         (array_agg(first_name   order by created_at asc, lead_id asc))[1] as first_name,
         (array_agg(last_name    order by created_at asc, lead_id asc))[1] as last_name,
         (array_agg(job_title    order by created_at asc, lead_id asc))[1] as job_title,
         (array_agg(seniority    order by created_at asc, lead_id asc))[1] as seniority,
         (array_agg(company      order by created_at asc, lead_id asc))[1] as company,
         (array_agg(industry     order by created_at asc, lead_id asc))[1] as industry,
         (array_agg(company_size order by created_at asc, lead_id asc))[1] as company_size,
         (array_agg(linkedin_url order by created_at asc, lead_id asc))[1] as linkedin_url,
         min(created_at)                                                 as sourced_at
  from owned_rows
  group by acquisition_key, email_norm, provider, provider_id
), costed as (
  select a.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as proven_cost
  from acquisition a
), classified as (
  select c.*,
         (c.distinct_costs > 1)                                          as cost_ambiguous,
         (c.distinct_costs = 0 and not (c.provider = 'apollo' and c.is_house)) as cost_unprovable,
         case when c.proven_cost is not null then c.proven_cost
              when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0 end as resolved_cost,
         (c.distinct_countries > 1)                                      as country_ambiguous,
         case when c.distinct_countries = 1 then c.one_country end        as resolved_country,
         exists (select 1 from public.lead_pool p where p.email_norm = c.email_norm) as already_pooled
  from costed c
), identity_state as (
  select email_norm,
         count(*)                                                        as acquisition_identities,
         bool_or(already_pooled)                                         as already_pooled,
         bool_or(has_role)                                               as has_role,
         bool_or(country_ambiguous)                                      as country_ambiguous,
         bool_or(cost_ambiguous)                                         as cost_ambiguous,
         bool_or(cost_unprovable)                                        as cost_unprovable,
         min(acquisition_key)                                            as only_key
  from classified group by email_norm
), executable as (
  -- THE EXECUTION SET. Phase B inserts exactly these; Phase A counts exactly these.
  select cl.*
  from classified cl
  join identity_state st on st.email_norm = cl.email_norm
  where st.acquisition_identities = 1        -- 2+ owned acquisitions → fail closed
    and not cl.already_pooled
    and cl.has_role
    and not cl.cost_ambiguous                -- ⚠️ ambiguity beats the house-zero default
    and not cl.cost_unprovable
    and cl.resolved_cost is not null
)
-- ── A3 · CURRENT PASS-1 FUNNEL. Projected inventory = eligible pool rows + the EXECUTABLE
--        set (never "any lead whose email qualifies"), so the metadata is proven-acquisition
--        metadata only. Country is canonicalised BEFORE distinctness inside the resolver.
--
--   ⚠️ CAVEATS, stated not hidden: isSuppressed() also reads the SUPPRESSED_DOMAINS env var,
--   invisible to SQL (only the hard-coded floor is reproduced); and the runtime bounded
--   candidate window and its storage-order effects cannot be reproduced here. The final
--   column is `after_sql_visible_runtime_gates` — never an absolute servability claim.
--   Client dedupe: set `params.client_id`; NULL means a FRESH client, who owns nothing.
, params as (
  select null::uuid as client_id     -- ← edit to the Pass-1 client's id, or leave NULL
), sup as (
  select lower(convert_from(decode(x, 'base64'), 'UTF8')) as d
  from unnest(array['c21hcnRzaGVldC5jb20=','YnJhbmRmb2xkZXIuY29t','b3V0Zml0Lmlv','c2xvcGVhcHAuY29t']) x
), universe as (
  select p.email_norm,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(p.country))),
                  nullif(lower(btrim(p.country)),''))      as canon_country,
         p.title, p.industry, p.seniority, p.company, p.linkedin_url, true as in_pool
  from public.lead_pool p
  where p.source in ('pdl','apollo')                        -- the READ fence, mirrored
  union all
  select e.email_norm, e.resolved_country,
         e.job_title, e.industry, e.seniority, e.company, e.linkedin_url, false
  from executable e                                          -- exactly Phase B's set
), gated as (
  select u.*,
         (lower(coalesce(u.title,'')) similar to
            '%(founder|ceo|chief executive|cro|chief revenue|vp sales|vp of sales|sales director|director of sales|head of sales)%'
          or lower(coalesce(u.industry,'')) similar to '%(software|saas)%'
          or lower(coalesce(u.seniority,'')) similar to '%(director|vp|c_suite|c-suite|owner|founder|head|chief)%') as role_ok,
         not exists (select 1 from public.opt_out_blocklist b
                      where lower(btrim(b.email)) = u.email_norm and b.opted_back_in_at is null) as blocklist_ok,
         not exists (select 1 from sup
                      where split_part(u.email_norm,'@',2) = sup.d
                         or split_part(u.email_norm,'@',2) like '%.'||sup.d
                         or lower(coalesce(u.company,'')||' '||coalesce(u.linkedin_url,'')) like '%'||sup.d||'%'
                         or lower(coalesce(u.company,'')||' '||coalesce(u.linkedin_url,'')) like '%'||split_part(sup.d,'.',1)||'%') as suppression_floor_ok,
         not exists (select 1 from params pr, public.leads own
                      where pr.client_id is not null and own.client_id = pr.client_id
                        and lower(btrim(own.email)) = u.email_norm)                              as dedupe_ok
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
       count(*) filter (where not in_pool)                                         as of_which_from_executable_promotion
from gated;


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — THE PROMOTION. FOUNDER-CONTROLLED ONLY. DO NOT RUN UNREAD.      │
-- │ Inserts EXACTLY the `executable` set A1b counted — same resolver, same    │
-- │ WHERE. One transaction. Idempotent. No provider call, no spend.           │
-- └──────────────────────────────────────────────────────────────────────────┘
begin;

with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_rows as (
  select l.id                                                          as lead_id,
         lower(btrim(l.email))                                         as email_norm,
         lower(coalesce(l.source,''))                                  as src,
         l.apollo_id                                                   as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company,
         l.industry, l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))                  as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))            as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), resolved_rows as (
  select r.*,
         case
           when r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end                                                            as provider,
         (r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as is_customer_row
  from lead_rows r
), owned_rows as (
  select rr.*,
         case when rr.provider_id is not null then rr.provider || ':' || rr.provider_id
              when rr.is_house then rr.provider || ':house:' || rr.email_norm
         end                                                            as acquisition_key
  from resolved_rows rr
  where rr.provider in ('pdl','apollo')
    and not rr.is_customer_row
    and (rr.provider_id is not null or rr.is_house)
), acquisition as (
  -- ⚠️ provider and provider_id are CONSTANT inside one acquisition_key (the key is built
  -- from them), so they are GROUPED BY, never aggregated. An aggregate here would read as a
  -- choice — and a choice is exactly what this pass exists to remove.
  select acquisition_key, email_norm, provider, provider_id,
         bool_or(is_house)                                              as is_house,
         count(distinct canon_country) filter (where canon_country is not null) as distinct_countries,
         min(canon_country) filter (where canon_country is not null)     as one_country,
         bool_or(coalesce(btrim(job_title),'') <> '' or coalesce(btrim(industry),'') <> ''
              or coalesce(btrim(seniority),'') <> '')                    as has_role,
         (array_agg(first_name   order by created_at asc, lead_id asc))[1] as first_name,
         (array_agg(last_name    order by created_at asc, lead_id asc))[1] as last_name,
         (array_agg(job_title    order by created_at asc, lead_id asc))[1] as job_title,
         (array_agg(seniority    order by created_at asc, lead_id asc))[1] as seniority,
         (array_agg(company      order by created_at asc, lead_id asc))[1] as company,
         (array_agg(industry     order by created_at asc, lead_id asc))[1] as industry,
         (array_agg(company_size order by created_at asc, lead_id asc))[1] as company_size,
         (array_agg(linkedin_url order by created_at asc, lead_id asc))[1] as linkedin_url,
         min(created_at)                                                 as sourced_at
  from owned_rows
  group by acquisition_key, email_norm, provider, provider_id
), costed as (
  select a.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as proven_cost
  from acquisition a
), classified as (
  select c.*,
         (c.distinct_costs > 1)                                          as cost_ambiguous,
         (c.distinct_costs = 0 and not (c.provider = 'apollo' and c.is_house)) as cost_unprovable,
         case when c.proven_cost is not null then c.proven_cost
              when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0 end as resolved_cost,
         (c.distinct_countries > 1)                                      as country_ambiguous,
         case when c.distinct_countries = 1 then c.one_country end        as resolved_country,
         exists (select 1 from public.lead_pool p where p.email_norm = c.email_norm) as already_pooled
  from costed c
), identity_state as (
  select email_norm,
         count(*)                                                        as acquisition_identities,
         bool_or(already_pooled)                                         as already_pooled,
         bool_or(has_role)                                               as has_role,
         bool_or(country_ambiguous)                                      as country_ambiguous,
         bool_or(cost_ambiguous)                                         as cost_ambiguous,
         bool_or(cost_unprovable)                                        as cost_unprovable,
         min(acquisition_key)                                            as only_key
  from classified group by email_norm
), executable as (
  -- THE EXECUTION SET. Phase B inserts exactly these; Phase A counts exactly these.
  select cl.*
  from classified cl
  join identity_state st on st.email_norm = cl.email_norm
  where st.acquisition_identities = 1        -- 2+ owned acquisitions → fail closed
    and not cl.already_pooled
    and cl.has_role
    and not cl.cost_ambiguous                -- ⚠️ ambiguity beats the house-zero default
    and not cl.cost_unprovable
    and cl.resolved_cost is not null
)
insert into public.lead_pool
  (email_norm, first_name, last_name, title, seniority, company, industry,
   company_size, country, linkedin_url, source, acquisition_cost, sourced_at)
select e.email_norm, e.first_name, e.last_name, e.job_title, e.seniority, e.company,
       e.industry, e.company_size,
       e.resolved_country,      -- one canonical country, or NULL (ambiguous or unknown)
       e.linkedin_url,
       e.provider,
       e.resolved_cost,
       e.sourced_at
from executable e
on conflict (email_norm) do nothing;   -- an existing pooled record is never overwritten

commit;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B2 — FILL-ONLY COUNTRY HEAL. Separate transaction, same resolver.   │
-- │ Only PROVEN acquisitions may supply a country, and only where the pooled  │
-- │ row has none. A customer/inbound or unresolved row can never contribute.  │
-- └──────────────────────────────────────────────────────────────────────────┘
begin;

with canon as (
  select unnest(array['us','u.s.','u.s.a.','usa','united states','united states of america','america']) as alias,
         'united states' as canonical
  union all select unnest(array['uk','u.k.','gb','gbr','united kingdom','great britain','britain',
                                'england','scotland','wales','northern ireland']), 'united kingdom'
  union all select unnest(array['za','zaf','south africa','rsa','republic of south africa','suid-afrika','suid afrika']), 'south africa'
), lead_rows as (
  select l.id                                                          as lead_id,
         lower(btrim(l.email))                                         as email_norm,
         lower(coalesce(l.source,''))                                  as src,
         l.apollo_id                                                   as provider_id,
         l.first_name, l.last_name, l.job_title, l.seniority, l.company,
         l.industry, l.company_size, l.linkedin_url, l.created_at,
         coalesce((select c.canonical from canon c where c.alias = lower(btrim(l.country))),
                  nullif(lower(btrim(l.country)), ''))                  as canon_country,
         exists (select 1 from public.clients c join auth.users u on u.id = c.user_id
                  where c.id = l.client_id and lower(u.email) = 'hello@get-kind.com') as is_house,
         (select case when count(distinct lower(btrim(am.source))) = 1
                      then min(lower(btrim(am.source))) end
            from public.acquisition_memory am
           where am.email_norm = lower(btrim(l.email))
             and am.provider_id = l.apollo_id
             and lower(btrim(am.source)) in ('pdl','apollo'))            as memory_provider
  from public.leads l
  where coalesce(btrim(l.email),'') <> ''
), resolved_rows as (
  select r.*,
         case
           when r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding') then null
           when r.src in ('pdl','apollo') then r.src
           when r.src = 'lookalike' then 'pdl'
           when r.is_house then 'apollo'
           when r.provider_id is not null then r.memory_provider
         end                                                            as provider,
         (r.src in ('csv_import','web_form','company_csv','vida_chat','milla_onboarding')) as is_customer_row
  from lead_rows r
), owned_rows as (
  select rr.*,
         case when rr.provider_id is not null then rr.provider || ':' || rr.provider_id
              when rr.is_house then rr.provider || ':house:' || rr.email_norm
         end                                                            as acquisition_key
  from resolved_rows rr
  where rr.provider in ('pdl','apollo')
    and not rr.is_customer_row
    and (rr.provider_id is not null or rr.is_house)
), acquisition as (
  -- ⚠️ provider and provider_id are CONSTANT inside one acquisition_key (the key is built
  -- from them), so they are GROUPED BY, never aggregated. An aggregate here would read as a
  -- choice — and a choice is exactly what this pass exists to remove.
  select acquisition_key, email_norm, provider, provider_id,
         bool_or(is_house)                                              as is_house,
         count(distinct canon_country) filter (where canon_country is not null) as distinct_countries,
         min(canon_country) filter (where canon_country is not null)     as one_country,
         bool_or(coalesce(btrim(job_title),'') <> '' or coalesce(btrim(industry),'') <> ''
              or coalesce(btrim(seniority),'') <> '')                    as has_role,
         (array_agg(first_name   order by created_at asc, lead_id asc))[1] as first_name,
         (array_agg(last_name    order by created_at asc, lead_id asc))[1] as last_name,
         (array_agg(job_title    order by created_at asc, lead_id asc))[1] as job_title,
         (array_agg(seniority    order by created_at asc, lead_id asc))[1] as seniority,
         (array_agg(company      order by created_at asc, lead_id asc))[1] as company,
         (array_agg(industry     order by created_at asc, lead_id asc))[1] as industry,
         (array_agg(company_size order by created_at asc, lead_id asc))[1] as company_size,
         (array_agg(linkedin_url order by created_at asc, lead_id asc))[1] as linkedin_url,
         min(created_at)                                                 as sourced_at
  from owned_rows
  group by acquisition_key, email_norm, provider, provider_id
), costed as (
  select a.*,
         (select count(distinct am.acquisition_cost_usd) from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as distinct_costs,
         (select case when count(distinct am.acquisition_cost_usd) = 1
                      then min(am.acquisition_cost_usd) end
            from public.acquisition_memory am
           where am.email_norm = a.email_norm and am.provider_id = a.provider_id
             and lower(btrim(am.source)) = a.provider)                   as proven_cost
  from acquisition a
), classified as (
  select c.*,
         (c.distinct_costs > 1)                                          as cost_ambiguous,
         (c.distinct_costs = 0 and not (c.provider = 'apollo' and c.is_house)) as cost_unprovable,
         case when c.proven_cost is not null then c.proven_cost
              when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0 end as resolved_cost,
         (c.distinct_countries > 1)                                      as country_ambiguous,
         case when c.distinct_countries = 1 then c.one_country end        as resolved_country,
         exists (select 1 from public.lead_pool p where p.email_norm = c.email_norm) as already_pooled
  from costed c
), identity_state as (
  select email_norm,
         count(*)                                                        as acquisition_identities,
         bool_or(already_pooled)                                         as already_pooled,
         bool_or(has_role)                                               as has_role,
         bool_or(country_ambiguous)                                      as country_ambiguous,
         bool_or(cost_ambiguous)                                         as cost_ambiguous,
         bool_or(cost_unprovable)                                        as cost_unprovable,
         min(acquisition_key)                                            as only_key
  from classified group by email_norm
), executable as (
  -- THE EXECUTION SET. Phase B inserts exactly these; Phase A counts exactly these.
  select cl.*
  from classified cl
  join identity_state st on st.email_norm = cl.email_norm
  where st.acquisition_identities = 1        -- 2+ owned acquisitions → fail closed
    and not cl.already_pooled
    and cl.has_role
    and not cl.cost_ambiguous                -- ⚠️ ambiguity beats the house-zero default
    and not cl.cost_unprovable
    and cl.resolved_cost is not null
)
, one_answer as (
  -- Across ALL owned acquisitions of one email (even where promotion itself is ambiguous),
  -- a country may be supplied only when every proven observation agrees on exactly one.
  select email_norm, min(resolved_country) as canon_country
  from classified
  where resolved_country is not null
  group by email_norm
  having count(distinct resolved_country) = 1
)
update public.lead_pool p
   set country = o.canon_country
  from one_answer o
 where p.email_norm = o.email_norm
   and coalesce(btrim(p.country),'') = '';   -- FILL ONLY — cannot overwrite

commit;

-- AFTER counts — compare with A1b.
select count(*)                                                    as pool_rows_after,
       count(*) filter (where coalesce(btrim(country),'') <> '')   as with_country,
       count(*) filter (where source = 'pdl')                      as pdl_rows,
       count(*) filter (where source = 'apollo')                   as apollo_rows
from public.lead_pool;
