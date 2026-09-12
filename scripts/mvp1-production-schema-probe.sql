-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MVP1 RUNTIME SPRINTS 1–3 — PRODUCTION SCHEMA PROBE  (v2)
--
-- 🛑 READ-ONLY. SELECT statements only. This script makes ZERO changes: no CREATE, ALTER,
-- DROP, UPDATE, DELETE, INSERT, TRUNCATE, GRANT, REVOKE, and it calls no function that could
-- mutate state. It reads information_schema and pg_catalog and nothing else. Every function
-- it calls (pg_get_function_identity_arguments, oidvectortypes, pg_get_expr, format_type) is
-- a catalog formatter. Safe to paste directly into the production Supabase SQL Editor.
--
-- WHAT IT ANSWERS: for every table, column, index, constraint, RLS policy and RPC function the
-- locked MVP1 Day 1–3 implementation depends on — is it PRESENT in this database, is it the
-- RIGHT SHAPE, and is each migration FULLY applied or only partly?
--
-- ── ⚑ v2 — WHAT CHANGED, AND WHY EACH GAP MATTERED ─────────────────────────────────────
--
-- ① A COLUMN OF THE WRONG TYPE NO LONGER READS AS PRESENT. v1 asked only whether a column
--    name existed. A `proof_passes_done` that is somehow `text`, or a `send_schedule` that is
--    `json` rather than `jsonb`, would have passed — and then failed at runtime on the first
--    write, which is the worst possible place to discover it. Verdict is now
--    PRESENT / *** TYPE MISMATCH *** / *** MISSING ***, and a mismatch prints expected vs actual.
--
-- ② RLS POLICIES ARE VERIFIED. `onboarding_brief_drafts` is the one table keyed by user_id
--    rather than client_id, holding a person's company, contact name and targeting BEFORE any
--    client row exists. Its two policies are the only thing between that and the public anon
--    key the portal ships to every browser. A table created with RLS enabled and no policy is
--    not "secure by default" — it is a table nobody can read and a migration half-applied.
--
-- ③ EVERY INDEX AND CONSTRAINT IN THE SPRINT 1–3 MIGRATION SET IS CHECKED — 26 indexes and
--    15 constraints, not the 4 and 2 v1 covered. Several are not performance hints but
--    CORRECTNESS guards: `programme_batches_one_running_uidx` is what stops one payment
--    opening two running batches against one ceiling, and `programmes_one_open_per_client_uidx`
--    is what stops a client holding two open programmes. A missing unique index of that kind
--    is a silent money defect, invisible to a column-only probe.
--
-- ④ FUNCTION SIGNATURES ARE COMPARED, NOT JUST NAMES. `try_spend_sourcing(uuid,int)` and
--    `try_spend_sourcing(uuid,int,uuid)` are different functions; PostgREST resolves the RPC by
--    argument names and would fail against the wrong arity while a name-only probe reported it
--    present. Actual identity arguments are printed for every one.
--
-- ⑤ PARTIALLY APPLIED MIGRATIONS CANNOT APPEAR GREEN. Section B rolls every required object up
--    to its migration and reports COMPLETE / *** PARTIAL *** / *** NOT APPLIED ***. This is not
--    theoretical: the runner applies each migration as one statement batch, and a
--    `CREATE UNIQUE INDEX` that fails on pre-existing duplicate rows leaves the columns added
--    and the guard absent. PARTIAL is the most dangerous state there is, because every
--    column-level check passes.
--
-- ── HOW TO READ IT ─────────────────────────────────────────────────────────────────────
-- The script returns TWO result sets.
--   SECTION A — object-by-object. Anything not PRESENT sorts to the TOP.
--   SECTION B — per-migration rollup. Read this one FIRST: it is the "is anything half-done?"
--               answer, and a *** PARTIAL *** row there outranks everything in Section A.
--
-- ⚠️ "MISSING" MEANS "NOT FOUND BY THIS QUERY". If the script errors, or a row reads oddly,
-- that is NOT evidence of absence — re-run rather than concluding.
-- ═══════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION A — OBJECT BY OBJECT
-- ═══════════════════════════════════════════════════════════════════════════════════════
WITH
-- ── ① EXPECTED COLUMNS (name AND type) ────────────────────────────────────────────────
-- expected_type is written in the short PostgreSQL spelling and normalised against
-- information_schema below, so 'timestamptz' matches 'timestamp with time zone'.
expected_columns (sprint, tbl, col, expected_type, migration) AS (
  VALUES
  -- ═══ SPRINT 1 — BRIEF ═══
  (1, 'onboarding_brief_drafts', 'id',                 'uuid',        '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'user_id',            'uuid',        '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'facts',              'jsonb',       '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'conversation',       'jsonb',       '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'confirmed_at',       'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'promoted_client_id', 'uuid',        '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'promoted_at',        'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'created_at',         'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'updated_at',         'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'icps',    'target_category',          'text',        '20260911_icp_target_category_and_type'),
  (1, 'icps',    'target_company_type',      'text',        '20260911_icp_target_category_and_type'),
  (1, 'clients', 'outcome_kind',             'text',        '20260910_client_stated_outcome'),
  (1, 'clients', 'outcome_stated',           'text',        '20260910_client_stated_outcome'),
  (1, 'clients', 'proof_started_at',         'timestamptz', '20260826_proof_started_at'),
  (1, 'clients', 'proof_completed_at',       'timestamptz', '20260910_proof_completion'),
  (1, 'clients', 'contact_email',            'text',        '20260806_audit_columns'),
  (1, 'clients', 'signup_terms_accepted_at', 'timestamptz', '(pre-existing — origin unidentified)'),

  -- ═══ SPRINT 2 — PROOF ═══
  (2, 'clients', 'proof_passes_done',                'integer',     '20260822_free_proof_acquisition'),
  (2, 'clients', 'proof_review_requested_at',        'timestamptz', '20260827_proof_review_handoff'),
  (2, 'clients', 'proof_review_resolved_at',         'timestamptz', '20260827_proof_review_handoff'),
  (2, 'clients', 'proof_review_icp_id',              'uuid',        '20260827_proof_review_handoff'),
  (2, 'clients', 'proof_escalation_trigger',         'text',        '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_phone_confirmed_at',         'timestamptz', '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_calibration_note',           'text',        '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_calibrated_restart_at',      'timestamptz', '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_calibrated_restart_used_at', 'timestamptz', '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_calibration_resolved_by',    'text',        '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_refinement_text',            'text',        '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_refinement_proposed_at',     'timestamptz', '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_refinement_confirmed_at',    'timestamptz', '20260911_proof_restart_and_refinement'),
  (2, 'leads',   'proof_pass',                       'smallint',    '20260903_lead_proof_attribution'),
  (2, 'leads',   'proof_batch_kind',                 'text',        '20260911_lead_proof_batch_kind'),

  -- ═══ SPRINT 3 — PROGRAMME / PREPARE / APPROVAL ═══
  (3, 'programmes', 'id',                            'uuid',        '20260828_programme_money_engine'),
  (3, 'programmes', 'client_id',                     'uuid',        '20260828_programme_money_engine'),
  (3, 'programmes', 'status',                        'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'meeting_target',                'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'recommended_volume',            'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'price_per_meeting_cents',       'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'price_total_cents',             'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'first_payment_cents',           'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'second_payment_cents',          'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'sourcing_ceiling',              'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'sourced_used',                  'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'sourced_reserved',              'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'first_paid_at',                 'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'second_paid_at',                'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'first_payment_ref',             'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'second_payment_ref',            'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'first_payment_intent_id',       'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'second_payment_intent_id',      'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'approved_at',                   'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'went_live_at',                  'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'paused_at',                     'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'pause_reason',                  'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'first_authorised_at',           'timestamptz', '20260902_programme_internal_authority'),
  (3, 'programmes', 'second_authorised_at',          'timestamptz', '20260902_programme_internal_authority'),
  (3, 'programmes', 'calculator_assumptions',        'jsonb',       '20260910_programme_calculator_choice'),
  (3, 'programmes', 'recommendation_accepted_at',    'timestamptz', '20260910_programme_calculator_choice'),
  (3, 'programmes', 'run_at',                        'timestamptz', '20260910_programme_run_authority'),
  (3, 'programmes', 'run_by',                        'text',        '20260910_programme_run_authority'),
  (3, 'programmes', 'went_live_by',                  'text',        '20260910_programme_run_authority'),
  (3, 'programmes', 'approved_preparation_hash',     'text',        '20260907_preparation_snapshot'),
  (3, 'programmes', 'approved_preparation_snapshot', 'jsonb',       '20260907_preparation_snapshot'),
  (3, 'programmes', 'approved_preparation_at',       'timestamptz', '20260907_preparation_snapshot'),
  (3, 'programmes', 'review_preparation_hash',       'text',        '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'review_preparation_snapshot',   'jsonb',       '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'review_preparation_at',         'timestamptz', '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'send_schedule',                 'jsonb',       '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'review_preparation_version',    'integer',     '20260911_preparation_version'),
  (3, 'programmes', 'approved_preparation_version',  'integer',     '20260911_preparation_version'),
  (3, 'programmes', 'approved_by_kind',              'text',        '20260911_preparation_version'),
  (3, 'programmes', 'approved_by_user_id',           'uuid',        '20260911_preparation_version'),
  (3, 'programme_batches', 'id',             'uuid',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'programme_id',   'uuid',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'seq',            'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'requested',      'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'granted',        'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'delivered',      'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'status',         'text',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'reservation_id', 'uuid',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'settled_at',     'timestamptz', '20260828_programme_money_engine'),
  (3, 'programme_batches', 'inserted',       'integer',     '20260909_programme_qualification'),
  (3, 'icps',              'programme_id',   'uuid',        '20260828_programme_money_engine'),
  (3, 'figsy_sequences',   'campaign_id',    'uuid',        '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments', 'programme_id',   'uuid',        '20260828_programme_money_engine'),
  (3, 'figsy_enrollments', 'sequence_id',    'uuid',        '20260908_review_freeze_and_schedule'),
  (3, 'client_inboxes',    'verified_at',      'timestamptz', '20260910_inbox_verification'),
  (3, 'client_inboxes',    'verify_failed_at', 'timestamptz', '20260910_inbox_verification'),
  (3, 'client_inboxes',    'verify_detail',    'text',        '20260910_inbox_verification'),
  (3, 'leads', 'programme_id',      'uuid',        '20260828_programme_money_engine'),
  (3, 'leads', 'batch_id',          'uuid',        '20260829_programme_delivery_control'),
  (3, 'leads', 'qualified_at',      'timestamptz', '20260909_programme_qualification'),
  (3, 'leads', 'disqualified_at',   'timestamptz', '20260909_programme_qualification'),
  (3, 'leads', 'disqualify_reason', 'text',        '20260909_programme_qualification'),
  (3, 'leads', 'email_status',      'text',        '20260909_programme_qualification')
),

-- ── ② EXPECTED TABLES ─────────────────────────────────────────────────────────────────
expected_tables (sprint, tbl, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', '20260911_onboarding_brief_drafts'),
  (1, 'clients',                 '(pre-existing)'),
  (1, 'icps',                    '(pre-existing)'),
  (2, 'leads',                   '(pre-existing)'),
  (2, 'proof_ledger',            '20260822_free_proof_acquisition'),
  (3, 'programmes',              '20260828_programme_money_engine'),
  (3, 'programme_batches',       '20260828_programme_money_engine'),
  (3, 'figsy_enrollments',       '(pre-existing)'),
  (3, 'figsy_sequences',         '(pre-existing)'),
  (3, 'figsy_campaigns',         '(pre-existing)'),
  (3, 'client_inboxes',          '20260725_client_inboxes'),
  (3, 'opt_out_blocklist',       '(pre-existing)'),
  (3, 'sourcing_ledger',         '(pre-existing)')
),

-- ── ③ EXPECTED FUNCTIONS, WITH THEIR IDENTITY ARGUMENTS ───────────────────────────────
-- 🛑 THE ARGUMENT LIST IS PART OF THE IDENTITY. PostgREST resolves an RPC by name AND
-- arguments; a function of the right name and the wrong arity fails at call time while a
-- name-only probe reports it present. `int` is spelled `integer` here because that is what
-- oidvectortypes returns.
expected_functions (sprint, fn, expected_args, migration) AS (
  VALUES
  (2, 'try_claim_proof_pass',           'uuid',                 '20260822_free_proof_acquisition'),
  (2, 'try_reserve_proof_records',      'uuid, integer',        '20260822_free_proof_acquisition'),
  (2, 'release_proof_records',          'uuid, integer',        '20260822_free_proof_acquisition'),
  (3, 'claim_programme_batch',          'uuid, integer, integer', '20260829_programme_delivery_control'),
  (3, 'settle_programme_batch',         'uuid, integer',        '20260828_programme_money_engine'),
  (3, 'try_spend_sourcing',             'uuid, integer, uuid',  '20260907_programme_sourcing_authority'),
  (3, 'try_reserve_programme_sourcing', 'uuid, integer',        '20260907_programme_sourcing_authority'),
  -- ⚠️ LAST DEFINED IN 20260909, NOT 20260907. It is CREATE OR REPLACE in both, and the 9 Sep
  -- body is the one that refuses while any candidate is unjudged. Last applied wins.
  (3, 'reconcile_programme_sourcing',   'uuid',                 '20260909_programme_qualification')
),

-- ── ④ EXPECTED INDEXES — EVERY ONE IN THE SPRINT 1–3 MIGRATION SET ────────────────────
-- 🛑 SEVERAL OF THESE ARE CORRECTNESS GUARDS, NOT PERFORMANCE HINTS. The `_uidx` entries are
-- what make a race safe: one running batch per programme, one open programme per client, one
-- payment reference used once. A missing unique index here is a silent money defect.
expected_indexes (sprint, idx, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts_open_idx',      '20260911_onboarding_brief_drafts'),
  (1, 'figsy_sent_emails_client_id_idx',       '20260806_audit_columns'),
  (2, 'clients_proof_review_open_idx',         '20260827_proof_review_handoff'),
  (2, 'leads_proof_pass_idx',                  '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_idx',            '20260911_lead_proof_batch_kind'),
  (2, 'proof_ledger_budget_month_idx',         '20260822_free_proof_acquisition'),
  (2, 'proof_ledger_client_idx',               '20260822_free_proof_acquisition'),
  (3, 'figsy_sequences_campaign_idx',          '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments_sequence_idx',        '20260908_review_freeze_and_schedule'),
  (3, 'leads_qualified_idx',                   '20260909_programme_qualification'),
  (3, 'leads_unjudged_candidates_idx',         '20260909_programme_qualification'),
  (3, 'icps_programme_idx',                    '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_idx',     '20260828_programme_money_engine'),
  (3, 'programme_batches_programme_idx',       '20260828_programme_money_engine'),
  (3, 'programme_batches_seq_uidx',            '20260828_programme_money_engine'),
  (3, 'programme_batches_stranded_idx',        '20260828_programme_money_engine'),
  (3, 'programmes_client_idx',                 '20260828_programme_money_engine'),
  (3, 'programmes_first_ref_uidx',             '20260828_programme_money_engine'),
  (3, 'programmes_one_open_per_client_uidx',   '20260828_programme_money_engine'),
  (3, 'programmes_second_ref_uidx',            '20260828_programme_money_engine'),
  (3, 'programmes_status_idx',                 '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_idx',         '20260828_programme_money_engine'),
  (3, 'leads_batch_idx',                       '20260829_programme_delivery_control'),
  (3, 'leads_programme_idx',                   '20260829_programme_delivery_control'),
  (3, 'programme_batches_one_running_uidx',    '20260829_programme_delivery_control'),
  (3, 'programmes_review_open_idx',            '20260829_programme_delivery_control'),
  (3, 'client_inboxes_client_id_idx',          '20260725_client_inboxes'),
  (3, 'client_inboxes_one_live_per_kind',      '20260725_client_inboxes'),
  (3, 'client_inboxes_status_idx',             '20260725_client_inboxes')
),

-- ── ⑤ EXPECTED CONSTRAINTS ────────────────────────────────────────────────────────────
-- ⚠️ `convalidated` IS REPORTED, NOT ASSUMED. Several of these are added NOT VALID on purpose
-- so the migration does not scan a live table; that is correct and is shown rather than judged.
expected_constraints (sprint, con, migration) AS (
  VALUES
  (2, 'leads_proof_pass_check',            '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_check',      '20260911_lead_proof_batch_kind'),
  (3, 'programmes_p1_authority_xor',       '20260902_programme_internal_authority'),
  (3, 'programmes_p2_authority_xor',       '20260902_programme_internal_authority'),
  (3, 'programmes_status_check',           '20260828_programme_money_engine'),
  (3, 'programmes_positive_check',         '20260828_programme_money_engine'),
  (3, 'programmes_ceiling_check',          '20260828_programme_money_engine'),
  (3, 'programmes_payment_split_check',    '20260828_programme_money_engine'),
  (3, 'programmes_pause_reason_check',     '20260828_programme_money_engine'),
  (3, 'programme_batches_status_check',    '20260828_programme_money_engine'),
  (3, 'programme_batches_positive_check',  '20260828_programme_money_engine'),
  (3, 'icps_programme_fk',                 '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_fk',      '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_fk',  '20260828_programme_money_engine'),
  (3, 'partner_commissions_basis_check',   '20260828_programme_money_engine')
),

-- ── ⑥ EXPECTED RLS POLICIES ───────────────────────────────────────────────────────────
-- 🛑 THE ONE TABLE THAT MOST NEEDS THEM. `onboarding_brief_drafts` is keyed by user_id, not
-- client_id, and exists precisely for people who have no client row — so the usual helper
-- answers NULL for exactly the rows it protects. Without these two policies a person's
-- company, contact name, targeting and stated outcome sit behind the public anon key the
-- portal ships to every browser. RLS enabled with no policy is a half-applied migration, not
-- a safe default.
expected_policies (sprint, tbl, policy, expected_cmd, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', 'own brief draft readable', 'SELECT', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'own brief draft writable', 'UPDATE', '20260911_onboarding_brief_drafts')
),

-- ═══ RESOLUTION ═══════════════════════════════════════════════════════════════════════
-- Normalise information_schema's verbose type names to the short spelling used above, so
-- 'timestamp with time zone' and 'timestamptz' are recognised as the same type and a genuine
-- difference is not drowned in spelling noise.
norm_columns AS (
  SELECT c.table_name, c.column_name, c.is_nullable, c.column_default,
         c.data_type, c.character_maximum_length,
         CASE lower(c.data_type)
           WHEN 'timestamp with time zone'    THEN 'timestamptz'
           WHEN 'timestamp without time zone' THEN 'timestamp'
           WHEN 'time with time zone'         THEN 'timetz'
           WHEN 'character varying'           THEN 'varchar'
           WHEN 'character'                   THEN 'bpchar'
           WHEN 'double precision'            THEN 'float8'
           WHEN 'real'                        THEN 'float4'
           WHEN 'boolean'                     THEN 'boolean'
           WHEN 'bigint'                      THEN 'bigint'
           WHEN 'user-defined'                THEN lower(c.udt_name)
           WHEN 'array'                       THEN lower(c.udt_name)
           ELSE lower(c.data_type)
         END AS norm_type
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
),

r_tables AS (
  SELECT e.sprint, e.migration,
         'TABLE       ' || e.tbl AS required_object, 'table' AS expected_type,
         CASE WHEN t.table_name IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN t.table_name IS NULL THEN 'apply: ' || e.migration
              ELSE 'exists in schema public' END AS actual_detail
  FROM expected_tables e
  LEFT JOIN information_schema.tables t
         ON t.table_schema = 'public' AND t.table_name = e.tbl
),

-- 🛑 THREE VERDICTS, NOT TWO. A column that exists with the wrong type is neither present nor
-- missing — it is the state that passes a preflight and fails on the first write.
r_columns AS (
  SELECT e.sprint, e.migration,
         e.tbl || '.' || e.col AS required_object, e.expected_type,
         CASE WHEN n.column_name IS NULL              THEN '*** MISSING ***'
              WHEN n.norm_type <> lower(e.expected_type) THEN '*** TYPE MISMATCH ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN n.column_name IS NULL THEN 'apply: ' || e.migration
              WHEN n.norm_type <> lower(e.expected_type)
                THEN 'EXPECTED ' || e.expected_type || ' — FOUND ' || n.data_type
                     || COALESCE('(' || n.character_maximum_length || ')', '')
                     || ' · this column cannot be trusted to hold what the code writes'
              ELSE n.data_type
                   || COALESCE('(' || n.character_maximum_length || ')', '')
                   || ' · nullable=' || n.is_nullable
                   || COALESCE(' · default=' || left(n.column_default, 40), '')
         END AS actual_detail
  FROM expected_columns e
  LEFT JOIN norm_columns n
         ON n.table_name = e.tbl AND n.column_name = e.col
),

-- Signature-aware. A name match with the wrong arguments is reported as a mismatch and the
-- actual identity arguments of every overload found are printed.
fn_actual AS (
  SELECT pr.proname,
         string_agg(pg_get_function_identity_arguments(pr.oid), ' | ' ORDER BY pr.oid) AS all_args,
         count(*) AS n_overloads
    FROM pg_catalog.pg_proc pr
    JOIN pg_catalog.pg_namespace ns ON ns.oid = pr.pronamespace
   WHERE ns.nspname = 'public'
   GROUP BY pr.proname
),
fn_exact AS (
  SELECT pr.proname, lower(oidvectortypes(pr.proargtypes)) AS args
    FROM pg_catalog.pg_proc pr
    JOIN pg_catalog.pg_namespace ns ON ns.oid = pr.pronamespace
   WHERE ns.nspname = 'public'
),
r_functions AS (
  SELECT e.sprint, e.migration,
         'FUNCTION    ' || e.fn || '(' || e.expected_args || ')' AS required_object,
         'function' AS expected_type,
         CASE WHEN a.proname IS NULL THEN '*** MISSING ***'
              WHEN NOT EXISTS (
                SELECT 1 FROM fn_exact x
                 WHERE x.proname = e.fn
                   AND replace(x.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
              ) THEN '*** SIGNATURE MISMATCH ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN a.proname IS NULL THEN 'apply: ' || e.migration
              WHEN NOT EXISTS (
                SELECT 1 FROM fn_exact x
                 WHERE x.proname = e.fn
                   AND replace(x.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
              ) THEN 'EXPECTED (' || e.expected_args || ') — FOUND (' || a.all_args
                   || ') · the RPC will not resolve at call time'
              ELSE 'overloads=' || a.n_overloads::text || ' · args: ' || a.all_args
         END AS actual_detail
  FROM expected_functions e
  LEFT JOIN fn_actual a ON a.proname = e.fn
),

r_indexes AS (
  SELECT e.sprint, e.migration,
         'INDEX       ' || e.idx AS required_object,
         CASE WHEN e.idx LIKE '%uidx' OR e.idx LIKE '%one_live_per_kind'
              THEN 'unique index (correctness guard)' ELSE 'index' END AS expected_type,
         CASE WHEN i.indexname IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN i.indexname IS NULL THEN 'apply: ' || e.migration
              ELSE 'on ' || i.tablename
                   || CASE WHEN i.indexdef ILIKE 'CREATE UNIQUE%' THEN ' · UNIQUE' ELSE '' END
                   || CASE WHEN i.indexdef ILIKE '%WHERE%'        THEN ' · partial' ELSE '' END
         END AS actual_detail
  FROM expected_indexes e
  LEFT JOIN pg_catalog.pg_indexes i
         ON i.schemaname = 'public' AND i.indexname = e.idx
),

r_constraints AS (
  SELECT e.sprint, e.migration,
         'CONSTRAINT  ' || e.con AS required_object,
         'constraint' AS expected_type,
         CASE WHEN k.conname IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN k.conname IS NULL THEN 'apply: ' || e.migration
              ELSE CASE k.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOREIGN KEY'
                                  WHEN 'u' THEN 'UNIQUE' WHEN 'p' THEN 'PRIMARY KEY'
                                  ELSE k.contype::text END
                   || ' on ' || k.rel
                   || ' · validated=' || k.convalidated::text
         END AS actual_detail
  FROM expected_constraints e
  LEFT JOIN (
    SELECT co.conname, co.contype, co.convalidated, cl.relname AS rel
      FROM pg_catalog.pg_constraint co
      JOIN pg_catalog.pg_namespace ns ON ns.oid = co.connamespace
      LEFT JOIN pg_catalog.pg_class cl ON cl.oid = co.conrelid
     WHERE ns.nspname = 'public'
  ) k ON k.conname = e.con
),

-- RLS: both the table-level switch and each named policy. Either alone is not protection.
r_rls_enabled AS (
  SELECT DISTINCT e.sprint, e.migration,
         'RLS ENABLED ' || e.tbl AS required_object,
         'row level security' AS expected_type,
         CASE WHEN c.relname IS NULL     THEN '*** MISSING ***'
              WHEN c.relrowsecurity THEN 'PRESENT'
              ELSE '*** RLS NOT ENABLED ***' END AS presence,
         CASE WHEN c.relname IS NULL THEN 'apply: ' || e.migration
              WHEN c.relrowsecurity
                THEN 'row level security is ON'
              ELSE 'the table exists with RLS OFF — every row is readable by the public anon key'
         END AS actual_detail
  FROM expected_policies e
  LEFT JOIN pg_catalog.pg_class c
         ON c.relname = e.tbl
        AND c.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
),
r_policies AS (
  SELECT e.sprint, e.migration,
         'POLICY      ' || e.tbl || ' / "' || e.policy || '"' AS required_object,
         'RLS policy (' || e.expected_cmd || ')' AS expected_type,
         CASE WHEN p.policyname IS NULL          THEN '*** MISSING ***'
              WHEN upper(p.cmd) <> e.expected_cmd THEN '*** WRONG COMMAND ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN p.policyname IS NULL THEN 'apply: ' || e.migration
              WHEN upper(p.cmd) <> e.expected_cmd
                THEN 'EXPECTED FOR ' || e.expected_cmd || ' — FOUND FOR ' || upper(p.cmd)
              ELSE 'FOR ' || upper(p.cmd) || ' TO ' || array_to_string(p.roles, ',')
                   || ' · using=' || COALESCE(left(p.qual, 60), '(none)')
                   || ' · check=' || COALESCE(left(p.with_check, 60), '(none)')
         END AS actual_detail
  FROM expected_policies e
  LEFT JOIN pg_catalog.pg_policies p
         ON p.schemaname = 'public' AND p.tablename = e.tbl AND p.policyname = e.policy
),

all_rows AS (
  SELECT * FROM r_tables
  UNION ALL SELECT * FROM r_columns
  UNION ALL SELECT * FROM r_functions
  UNION ALL SELECT * FROM r_indexes
  UNION ALL SELECT * FROM r_constraints
  UNION ALL SELECT * FROM r_rls_enabled
  UNION ALL SELECT * FROM r_policies
)
SELECT 'A' AS section, sprint, presence, required_object, expected_type, migration, actual_detail
  FROM all_rows
 -- Anything not PRESENT sorts to the top, so the answer is the first thing on screen.
 ORDER BY CASE WHEN presence = 'PRESENT' THEN 1 ELSE 0 END, sprint, required_object;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION B — PER-MIGRATION ROLLUP.  🛑 READ THIS ONE FIRST.
--
-- A migration is COMPLETE only when EVERY object it owns is present and correctly shaped.
-- *** PARTIAL *** is the dangerous state and the reason this section exists: the runner applies
-- a migration as one statement batch, so a CREATE UNIQUE INDEX that fails on pre-existing
-- duplicate rows leaves the columns added and the guard absent. Every column-level check then
-- passes while the correctness guarantee is gone. A PARTIAL row here outranks everything in
-- Section A.
-- ═══════════════════════════════════════════════════════════════════════════════════════
WITH
expected_columns (sprint, tbl, col, expected_type, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', 'id',                 'uuid',        '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'user_id',            'uuid',        '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'facts',              'jsonb',       '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'conversation',       'jsonb',       '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'confirmed_at',       'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'promoted_client_id', 'uuid',        '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'promoted_at',        'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'created_at',         'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'updated_at',         'timestamptz', '20260911_onboarding_brief_drafts'),
  (1, 'icps',    'target_category',          'text',        '20260911_icp_target_category_and_type'),
  (1, 'icps',    'target_company_type',      'text',        '20260911_icp_target_category_and_type'),
  (1, 'clients', 'outcome_kind',             'text',        '20260910_client_stated_outcome'),
  (1, 'clients', 'outcome_stated',           'text',        '20260910_client_stated_outcome'),
  (1, 'clients', 'proof_started_at',         'timestamptz', '20260826_proof_started_at'),
  (1, 'clients', 'proof_completed_at',       'timestamptz', '20260910_proof_completion'),
  (1, 'clients', 'contact_email',            'text',        '20260806_audit_columns'),
  (1, 'clients', 'signup_terms_accepted_at', 'timestamptz', '(pre-existing — origin unidentified)'),
  (2, 'clients', 'proof_passes_done',                'integer',     '20260822_free_proof_acquisition'),
  (2, 'clients', 'proof_review_requested_at',        'timestamptz', '20260827_proof_review_handoff'),
  (2, 'clients', 'proof_review_resolved_at',         'timestamptz', '20260827_proof_review_handoff'),
  (2, 'clients', 'proof_review_icp_id',              'uuid',        '20260827_proof_review_handoff'),
  (2, 'clients', 'proof_escalation_trigger',         'text',        '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_phone_confirmed_at',         'timestamptz', '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_calibration_note',           'text',        '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_calibrated_restart_at',      'timestamptz', '20260910_proof_calibration_handoff'),
  (2, 'clients', 'proof_calibrated_restart_used_at', 'timestamptz', '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_calibration_resolved_by',    'text',        '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_refinement_text',            'text',        '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_refinement_proposed_at',     'timestamptz', '20260911_proof_restart_and_refinement'),
  (2, 'clients', 'proof_refinement_confirmed_at',    'timestamptz', '20260911_proof_restart_and_refinement'),
  (2, 'leads',   'proof_pass',                       'smallint',    '20260903_lead_proof_attribution'),
  (2, 'leads',   'proof_batch_kind',                 'text',        '20260911_lead_proof_batch_kind'),
  (3, 'programmes', 'id',                            'uuid',        '20260828_programme_money_engine'),
  (3, 'programmes', 'client_id',                     'uuid',        '20260828_programme_money_engine'),
  (3, 'programmes', 'status',                        'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'meeting_target',                'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'recommended_volume',            'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'price_per_meeting_cents',       'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'price_total_cents',             'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'first_payment_cents',           'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'second_payment_cents',          'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'sourcing_ceiling',              'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'sourced_used',                  'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'sourced_reserved',              'integer',     '20260828_programme_money_engine'),
  (3, 'programmes', 'first_paid_at',                 'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'second_paid_at',                'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'first_payment_ref',             'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'second_payment_ref',            'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'first_payment_intent_id',       'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'second_payment_intent_id',      'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'approved_at',                   'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'went_live_at',                  'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'paused_at',                     'timestamptz', '20260828_programme_money_engine'),
  (3, 'programmes', 'pause_reason',                  'text',        '20260828_programme_money_engine'),
  (3, 'programmes', 'first_authorised_at',           'timestamptz', '20260902_programme_internal_authority'),
  (3, 'programmes', 'second_authorised_at',          'timestamptz', '20260902_programme_internal_authority'),
  (3, 'programmes', 'calculator_assumptions',        'jsonb',       '20260910_programme_calculator_choice'),
  (3, 'programmes', 'recommendation_accepted_at',    'timestamptz', '20260910_programme_calculator_choice'),
  (3, 'programmes', 'run_at',                        'timestamptz', '20260910_programme_run_authority'),
  (3, 'programmes', 'run_by',                        'text',        '20260910_programme_run_authority'),
  (3, 'programmes', 'went_live_by',                  'text',        '20260910_programme_run_authority'),
  (3, 'programmes', 'approved_preparation_hash',     'text',        '20260907_preparation_snapshot'),
  (3, 'programmes', 'approved_preparation_snapshot', 'jsonb',       '20260907_preparation_snapshot'),
  (3, 'programmes', 'approved_preparation_at',       'timestamptz', '20260907_preparation_snapshot'),
  (3, 'programmes', 'review_preparation_hash',       'text',        '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'review_preparation_snapshot',   'jsonb',       '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'review_preparation_at',         'timestamptz', '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'send_schedule',                 'jsonb',       '20260908_review_freeze_and_schedule'),
  (3, 'programmes', 'review_preparation_version',    'integer',     '20260911_preparation_version'),
  (3, 'programmes', 'approved_preparation_version',  'integer',     '20260911_preparation_version'),
  (3, 'programmes', 'approved_by_kind',              'text',        '20260911_preparation_version'),
  (3, 'programmes', 'approved_by_user_id',           'uuid',        '20260911_preparation_version'),
  (3, 'programme_batches', 'id',             'uuid',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'programme_id',   'uuid',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'seq',            'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'requested',      'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'granted',        'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'delivered',      'integer',     '20260828_programme_money_engine'),
  (3, 'programme_batches', 'status',         'text',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'reservation_id', 'uuid',        '20260828_programme_money_engine'),
  (3, 'programme_batches', 'settled_at',     'timestamptz', '20260828_programme_money_engine'),
  (3, 'programme_batches', 'inserted',       'integer',     '20260909_programme_qualification'),
  (3, 'icps',              'programme_id',   'uuid',        '20260828_programme_money_engine'),
  (3, 'figsy_sequences',   'campaign_id',    'uuid',        '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments', 'programme_id',   'uuid',        '20260828_programme_money_engine'),
  (3, 'figsy_enrollments', 'sequence_id',    'uuid',        '20260908_review_freeze_and_schedule'),
  (3, 'client_inboxes',    'verified_at',      'timestamptz', '20260910_inbox_verification'),
  (3, 'client_inboxes',    'verify_failed_at', 'timestamptz', '20260910_inbox_verification'),
  (3, 'client_inboxes',    'verify_detail',    'text',        '20260910_inbox_verification'),
  (3, 'leads', 'programme_id',      'uuid',        '20260828_programme_money_engine'),
  (3, 'leads', 'batch_id',          'uuid',        '20260829_programme_delivery_control'),
  (3, 'leads', 'qualified_at',      'timestamptz', '20260909_programme_qualification'),
  (3, 'leads', 'disqualified_at',   'timestamptz', '20260909_programme_qualification'),
  (3, 'leads', 'disqualify_reason', 'text',        '20260909_programme_qualification'),
  (3, 'leads', 'email_status',      'text',        '20260909_programme_qualification')
),
expected_tables (sprint, tbl, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', '20260911_onboarding_brief_drafts'),
  (2, 'proof_ledger',            '20260822_free_proof_acquisition'),
  (3, 'programmes',              '20260828_programme_money_engine'),
  (3, 'programme_batches',       '20260828_programme_money_engine'),
  (3, 'client_inboxes',          '20260725_client_inboxes')
),
expected_functions (sprint, fn, expected_args, migration) AS (
  VALUES
  (2, 'try_claim_proof_pass',           'uuid',                   '20260822_free_proof_acquisition'),
  (2, 'try_reserve_proof_records',      'uuid, integer',          '20260822_free_proof_acquisition'),
  (2, 'release_proof_records',          'uuid, integer',          '20260822_free_proof_acquisition'),
  (3, 'claim_programme_batch',          'uuid, integer, integer', '20260829_programme_delivery_control'),
  (3, 'settle_programme_batch',         'uuid, integer',          '20260828_programme_money_engine'),
  (3, 'try_spend_sourcing',             'uuid, integer, uuid',    '20260907_programme_sourcing_authority'),
  (3, 'try_reserve_programme_sourcing', 'uuid, integer',          '20260907_programme_sourcing_authority'),
  (3, 'reconcile_programme_sourcing',   'uuid',                   '20260909_programme_qualification')
),
expected_indexes (sprint, idx, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts_open_idx',      '20260911_onboarding_brief_drafts'),
  (1, 'figsy_sent_emails_client_id_idx',       '20260806_audit_columns'),
  (2, 'clients_proof_review_open_idx',         '20260827_proof_review_handoff'),
  (2, 'leads_proof_pass_idx',                  '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_idx',            '20260911_lead_proof_batch_kind'),
  (2, 'proof_ledger_budget_month_idx',         '20260822_free_proof_acquisition'),
  (2, 'proof_ledger_client_idx',               '20260822_free_proof_acquisition'),
  (3, 'figsy_sequences_campaign_idx',          '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments_sequence_idx',        '20260908_review_freeze_and_schedule'),
  (3, 'leads_qualified_idx',                   '20260909_programme_qualification'),
  (3, 'leads_unjudged_candidates_idx',         '20260909_programme_qualification'),
  (3, 'icps_programme_idx',                    '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_idx',     '20260828_programme_money_engine'),
  (3, 'programme_batches_programme_idx',       '20260828_programme_money_engine'),
  (3, 'programme_batches_seq_uidx',            '20260828_programme_money_engine'),
  (3, 'programme_batches_stranded_idx',        '20260828_programme_money_engine'),
  (3, 'programmes_client_idx',                 '20260828_programme_money_engine'),
  (3, 'programmes_first_ref_uidx',             '20260828_programme_money_engine'),
  (3, 'programmes_one_open_per_client_uidx',   '20260828_programme_money_engine'),
  (3, 'programmes_second_ref_uidx',            '20260828_programme_money_engine'),
  (3, 'programmes_status_idx',                 '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_idx',         '20260828_programme_money_engine'),
  (3, 'leads_batch_idx',                       '20260829_programme_delivery_control'),
  (3, 'leads_programme_idx',                   '20260829_programme_delivery_control'),
  (3, 'programme_batches_one_running_uidx',    '20260829_programme_delivery_control'),
  (3, 'programmes_review_open_idx',            '20260829_programme_delivery_control'),
  (3, 'client_inboxes_client_id_idx',          '20260725_client_inboxes'),
  (3, 'client_inboxes_one_live_per_kind',      '20260725_client_inboxes'),
  (3, 'client_inboxes_status_idx',             '20260725_client_inboxes')
),
expected_constraints (sprint, con, migration) AS (
  VALUES
  (2, 'leads_proof_pass_check',            '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_check',      '20260911_lead_proof_batch_kind'),
  (3, 'programmes_p1_authority_xor',       '20260902_programme_internal_authority'),
  (3, 'programmes_p2_authority_xor',       '20260902_programme_internal_authority'),
  (3, 'programmes_status_check',           '20260828_programme_money_engine'),
  (3, 'programmes_positive_check',         '20260828_programme_money_engine'),
  (3, 'programmes_ceiling_check',          '20260828_programme_money_engine'),
  (3, 'programmes_payment_split_check',    '20260828_programme_money_engine'),
  (3, 'programmes_pause_reason_check',     '20260828_programme_money_engine'),
  (3, 'programme_batches_status_check',    '20260828_programme_money_engine'),
  (3, 'programme_batches_positive_check',  '20260828_programme_money_engine'),
  (3, 'icps_programme_fk',                 '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_fk',      '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_fk',  '20260828_programme_money_engine'),
  (3, 'partner_commissions_basis_check',   '20260828_programme_money_engine')
),
expected_policies (sprint, tbl, policy, expected_cmd, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', 'own brief draft readable', 'SELECT', '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'own brief draft writable', 'UPDATE', '20260911_onboarding_brief_drafts')
),
norm_columns AS (
  SELECT c.table_name, c.column_name,
         CASE lower(c.data_type)
           WHEN 'timestamp with time zone'    THEN 'timestamptz'
           WHEN 'timestamp without time zone' THEN 'timestamp'
           WHEN 'time with time zone'         THEN 'timetz'
           WHEN 'character varying'           THEN 'varchar'
           WHEN 'character'                   THEN 'bpchar'
           WHEN 'double precision'            THEN 'float8'
           WHEN 'real'                        THEN 'float4'
           WHEN 'user-defined'                THEN lower(c.udt_name)
           WHEN 'array'                       THEN lower(c.udt_name)
           ELSE lower(c.data_type)
         END AS norm_type
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
),
fn_exact AS (
  SELECT pr.proname, lower(oidvectortypes(pr.proargtypes)) AS args
    FROM pg_catalog.pg_proc pr
    JOIN pg_catalog.pg_namespace ns ON ns.oid = pr.pronamespace
   WHERE ns.nspname = 'public'
),
-- Every required object, reduced to (migration, ok?) — 1 = correctly present, 0 = not.
obj (sprint, migration, ok) AS (
  SELECT e.sprint, e.migration,
         CASE WHEN n.column_name IS NOT NULL AND n.norm_type = lower(e.expected_type) THEN 1 ELSE 0 END
    FROM expected_columns e
    LEFT JOIN norm_columns n ON n.table_name = e.tbl AND n.column_name = e.col
  UNION ALL
  SELECT e.sprint, e.migration, CASE WHEN t.table_name IS NOT NULL THEN 1 ELSE 0 END
    FROM expected_tables e
    LEFT JOIN information_schema.tables t
           ON t.table_schema = 'public' AND t.table_name = e.tbl
  UNION ALL
  SELECT e.sprint, e.migration,
         CASE WHEN EXISTS (
           SELECT 1 FROM fn_exact x
            WHERE x.proname = e.fn
              AND replace(x.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
         ) THEN 1 ELSE 0 END
    FROM expected_functions e
  UNION ALL
  SELECT e.sprint, e.migration, CASE WHEN i.indexname IS NOT NULL THEN 1 ELSE 0 END
    FROM expected_indexes e
    LEFT JOIN pg_catalog.pg_indexes i
           ON i.schemaname = 'public' AND i.indexname = e.idx
  UNION ALL
  SELECT e.sprint, e.migration, CASE WHEN k.conname IS NOT NULL THEN 1 ELSE 0 END
    FROM expected_constraints e
    LEFT JOIN (
      SELECT co.conname
        FROM pg_catalog.pg_constraint co
        JOIN pg_catalog.pg_namespace ns ON ns.oid = co.connamespace
       WHERE ns.nspname = 'public'
    ) k ON k.conname = e.con
  UNION ALL
  SELECT e.sprint, e.migration,
         CASE WHEN p.policyname IS NOT NULL AND upper(p.cmd) = e.expected_cmd THEN 1 ELSE 0 END
    FROM expected_policies e
    LEFT JOIN pg_catalog.pg_policies p
           ON p.schemaname = 'public' AND p.tablename = e.tbl AND p.policyname = e.policy
  UNION ALL
  SELECT DISTINCT e.sprint, e.migration, CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END
    FROM expected_policies e
    LEFT JOIN pg_catalog.pg_class c
           ON c.relname = e.tbl
          AND c.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
)
SELECT 'B' AS section,
       min(sprint)                              AS earliest_sprint,
       CASE WHEN sum(ok) = count(*) THEN 'COMPLETE'
            WHEN sum(ok) = 0        THEN '*** NOT APPLIED ***'
            ELSE '*** PARTIAL ***' END          AS migration_state,
       migration,
       count(*)                                 AS objects_required,
       sum(ok)                                  AS objects_present,
       count(*) - sum(ok)                       AS objects_missing
  FROM obj
 GROUP BY migration
 -- PARTIAL first: a half-applied migration is more dangerous than one that never ran, because
 -- every column-level check passes while the guarantee is gone.
 ORDER BY CASE WHEN sum(ok) = count(*) THEN 2
               WHEN sum(ok) = 0        THEN 1
               ELSE 0 END,
          migration;
