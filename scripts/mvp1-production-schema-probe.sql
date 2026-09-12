-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MVP1 RUNTIME SPRINTS 1–3 — PRODUCTION SCHEMA PROBE
--
-- 🛑 READ-ONLY. SELECT statements only. This script makes ZERO changes: no CREATE, ALTER,
-- DROP, UPDATE, DELETE, INSERT, TRUNCATE, GRANT, REVOKE, and it calls no function that could
-- mutate state. It reads information_schema and pg_catalog and nothing else. It is safe to
-- paste directly into the production Supabase SQL Editor.
--
-- WHAT IT ANSWERS: for every table, column, index, constraint and function the locked MVP1
-- Day 1–3 implementation depends on, is it PRESENT in this database, and if so what is its
-- actual definition?
--
-- ⚠️ FILENAMES ARE NOT EVIDENCE. A column may exist without any migration ledger recording
-- it, and a migration file may exist without ever having been applied. This asks the database.
--
-- ⚠️ "MISSING" HERE MEANS "NOT FOUND BY THIS QUERY". If the whole script errors, or a row
-- reads oddly, that is NOT evidence of absence — re-run rather than concluding.
--
-- HOW TO READ THE OUTPUT
--   SPRINT        which runtime sprint needs it (1 = Brief, 2 = Proof, 3 = Programme)
--   REQUIRED_OBJECT  table, table.column, index, constraint or function()
--   EXPECTED_TYPE    the data type / object kind the code expects
--   PRESENCE         PRESENT or *** MISSING ***
--   ACTUAL_DETAIL    what the database actually has, or the migration that would add it
--
-- Sort is by PRESENCE first, so everything MISSING appears at the TOP of the result.
-- ═══════════════════════════════════════════════════════════════════════════════════════

WITH
-- ── ① EXPECTED COLUMNS ────────────────────────────────────────────────────────────────
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
  (1, 'clients', 'signup_terms_accepted_at', 'timestamptz', '(pre-existing — confirm origin)'),

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
  (3, 'programme_batches', 'id',             'uuid',    '20260828_programme_money_engine'),
  (3, 'programme_batches', 'programme_id',   'uuid',    '20260828_programme_money_engine'),
  (3, 'programme_batches', 'seq',            'integer', '20260828_programme_money_engine'),
  (3, 'programme_batches', 'status',         'text',    '20260828_programme_money_engine'),
  (3, 'programme_batches', 'inserted',       'integer', '20260909_programme_qualification'),
  (3, 'icps',              'programme_id',   'uuid',    '20260828_programme_money_engine'),
  (3, 'figsy_sequences',   'campaign_id',    'uuid',    '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments', 'programme_id',   'uuid',    '20260828_programme_money_engine'),
  (3, 'figsy_enrollments', 'sequence_id',    'uuid',    '20260908_review_freeze_and_schedule'),
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
  (3, 'programmes',              '20260828_programme_money_engine'),
  (3, 'programme_batches',       '20260828_programme_money_engine'),
  (3, 'figsy_enrollments',       '(pre-existing)'),
  (3, 'figsy_sequences',         '(pre-existing)'),
  (3, 'figsy_campaigns',         '(pre-existing)'),
  (3, 'client_inboxes',          '20260725_client_inboxes'),
  (3, 'opt_out_blocklist',       '(pre-existing)'),
  (3, 'sourcing_ledger',         '(pre-existing)')
),

-- ── ③ EXPECTED FUNCTIONS (RPCs the running code calls) ────────────────────────────────
expected_functions (sprint, fn, migration) AS (
  VALUES
  (2, 'try_claim_proof_pass',            '20260822_free_proof_acquisition'),
  (2, 'try_reserve_proof_records',       '20260822_free_proof_acquisition'),
  (2, 'release_proof_records',           '20260822_free_proof_acquisition'),
  (3, 'claim_programme_batch',           '20260829_programme_delivery_control'),
  (3, 'settle_programme_batch',          '20260828_programme_money_engine'),
  (3, 'try_spend_sourcing',              '20260907_programme_sourcing_authority'),
  (3, 'try_reserve_programme_sourcing',  '20260907_programme_sourcing_authority'),
  (3, 'reconcile_programme_sourcing',    '20260907_programme_sourcing_authority')
),

-- ── ④ EXPECTED INDEXES AND CHECK CONSTRAINTS ──────────────────────────────────────────
expected_indexes (sprint, idx, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts_open_idx', '20260911_onboarding_brief_drafts'),
  (2, 'leads_proof_pass_idx',             '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_idx',       '20260911_lead_proof_batch_kind'),
  (2, 'clients_proof_review_open_idx',    '20260827_proof_review_handoff')
),
expected_constraints (sprint, con, migration) AS (
  VALUES
  (2, 'leads_proof_pass_check',       '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_check', '20260911_lead_proof_batch_kind')
),

-- ── RESULTS ───────────────────────────────────────────────────────────────────────────
r_tables AS (
  SELECT e.sprint, 'TABLE  ' || e.tbl AS required_object, 'table' AS expected_type,
         CASE WHEN t.table_name IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN t.table_name IS NULL THEN 'apply: ' || e.migration
              ELSE 'exists in schema public' END AS actual_detail
  FROM expected_tables e
  LEFT JOIN information_schema.tables t
         ON t.table_schema = 'public' AND t.table_name = e.tbl
),
r_columns AS (
  SELECT e.sprint, e.tbl || '.' || e.col AS required_object, e.expected_type,
         CASE WHEN c.column_name IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN c.column_name IS NULL THEN 'apply: ' || e.migration
              ELSE c.data_type
                   || COALESCE(' (' || c.character_maximum_length || ')', '')
                   || ' · nullable=' || c.is_nullable
                   || COALESCE(' · default=' || left(c.column_default, 40), '')
         END AS actual_detail
  FROM expected_columns e
  LEFT JOIN information_schema.columns c
         ON c.table_schema = 'public' AND c.table_name = e.tbl AND c.column_name = e.col
),
r_functions AS (
  SELECT e.sprint, 'FUNCTION ' || e.fn || '()' AS required_object, 'function' AS expected_type,
         CASE WHEN p.proname IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN p.proname IS NULL THEN 'apply: ' || e.migration
              ELSE 'overloads=' || p.n::text END AS actual_detail
  FROM expected_functions e
  LEFT JOIN (
    SELECT pr.proname, count(*) AS n
      FROM pg_catalog.pg_proc pr
      JOIN pg_catalog.pg_namespace ns ON ns.oid = pr.pronamespace
     WHERE ns.nspname = 'public'
     GROUP BY pr.proname
  ) p ON p.proname = e.fn
),
r_indexes AS (
  SELECT e.sprint, 'INDEX  ' || e.idx AS required_object, 'index' AS expected_type,
         CASE WHEN i.indexname IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN i.indexname IS NULL THEN 'apply: ' || e.migration
              ELSE 'on ' || i.tablename END AS actual_detail
  FROM expected_indexes e
  LEFT JOIN pg_catalog.pg_indexes i
         ON i.schemaname = 'public' AND i.indexname = e.idx
),
r_constraints AS (
  SELECT e.sprint, 'CONSTRAINT ' || e.con AS required_object, 'check constraint' AS expected_type,
         CASE WHEN k.conname IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END AS presence,
         CASE WHEN k.conname IS NULL THEN 'apply: ' || e.migration
              ELSE 'validated=' || k.convalidated::text END AS actual_detail
  FROM expected_constraints e
  LEFT JOIN (
    SELECT co.conname, co.convalidated
      FROM pg_catalog.pg_constraint co
      JOIN pg_catalog.pg_namespace ns ON ns.oid = co.connamespace
     WHERE ns.nspname = 'public'
  ) k ON k.conname = e.con
)
SELECT sprint, presence, required_object, expected_type, actual_detail
  FROM (
    SELECT * FROM r_tables
    UNION ALL SELECT * FROM r_columns
    UNION ALL SELECT * FROM r_functions
    UNION ALL SELECT * FROM r_indexes
    UNION ALL SELECT * FROM r_constraints
  ) all_rows
 -- MISSING first, so the answer is at the top of the result rather than buried in it.
 ORDER BY CASE WHEN presence = 'PRESENT' THEN 1 ELSE 0 END, sprint, required_object;
