-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MVP1 RUNTIME SPRINTS 1–3 — PRODUCTION SCHEMA PROBE  (v3)
--
-- 🛑 READ-ONLY. SELECT statements only. No CREATE, ALTER, DROP, UPDATE, DELETE, INSERT,
-- TRUNCATE, GRANT, REVOKE. Every function it calls — pg_get_constraintdef,
-- pg_get_functiondef, pg_get_function_identity_arguments, oidvectortypes — is a catalog
-- formatter that reads and returns text. Safe to paste into the production Supabase SQL Editor.
--
-- ── ⚑ v3 — NAMES ARE NOT DEFINITIONS ───────────────────────────────────────────────────
--
-- v2 verified that objects EXIST. v3 verifies they are the RIGHT OBJECTS. Every gap below
-- was a way a wrong database could still have reported green:
--
-- ① INDEXES ARE COMPARED BY DEFINITION. An index of the right name on the wrong column, or
--    missing its UNIQUE, or carrying a different partial WHERE, is not the guard the code
--    relies on. `programme_batches_one_running_uidx` without UNIQUE lets one payment open two
--    running batches against one ceiling. `programmes_one_open_per_client_uidx` with the wrong
--    predicate lets a client hold two open programmes. Both would have passed v2.
--
-- ② CONSTRAINTS ARE COMPARED BY DEFINITION. This one has already bitten this project: a
--    `leads_proof_pass_check` that permitted `proof_pass IN (1,2,3)` rather than `(1,2)` is a
--    name-identical constraint that silently allows a third automatic proof pass. A broader
--    CHECK is the most dangerous kind of wrong, because nothing fails until the rule it was
--    supposed to enforce is broken.
--
-- ③ FUNCTION BODIES ARE COMPARED, NOT JUST SIGNATURES. `CREATE OR REPLACE` keeps the name and
--    the arguments and replaces the logic — so an older body deployed under the current
--    signature is invisible to a signature check. THREE of these functions were genuinely
--    superseded by a later migration, and each is checked for a marker that appears in the
--    current body and NOT in the old one (verified in both directions):
--      try_claim_proof_pass         20260822 → 20260826   marker: proof_started_at
--      try_spend_sourcing           20260711/28 → 20260907 marker: try_reserve_programme_sourcing
--      reconcile_programme_sourcing 20260907 → 20260909   marker: v_unjudged
--    Running the OLD try_spend_sourcing means programme reservations are never taken.
--
-- ④ RLS POLICY EXPRESSIONS ARE COMPARED. A policy named correctly, for the right command, with
--    `USING (true)` is not protection — it is an open table wearing a policy's name.
--
-- ⑤ SECTION B NO LONGER SAYS "COMPLETE". It says MVP1 OBJECTS VALIDATED, because that is the
--    only thing it can honestly claim: every object MVP1 RELIES ON from that migration is
--    present and correctly shaped. It does NOT prove the whole migration file ran — a migration
--    also creates comments, grants and objects outside MVP1's dependency set, and none of those
--    are checked here.
--
-- ── HOW EXPECTED VALUES WERE OBTAINED ──────────────────────────────────────────────────
-- Every expected definition below was rendered by PostgreSQL 16 itself, by applying the
-- canonical migration DDL to a throwaway database and reading it back from the catalog. They
-- are not hand-written guesses at how Postgres normalises `IN (...)` → `= ANY (ARRAY[...])`
-- or `NOT IN` → `<> ALL (ARRAY[...])`, because a guess at that is exactly how a comparison
-- produces false mismatches and gets disabled.
--
-- ── THE NORMALISER ─────────────────────────────────────────────────────────────────────
-- Both sides are reduced with the same expression: strip `::type` casts, collapse parentheses,
-- quotes and whitespace to single spaces, lowercase, trim. It PRESERVES operators and keywords
-- — `>=` stays distinct from `>`, and `IS NULL` stays distinct from `IS NOT NULL` — because an
-- earlier draft of this file stripped those too and could not tell them apart.
--
-- ── HOW TO READ IT ─────────────────────────────────────────────────────────────────────
-- TWO result sets.
--   SECTION A — object by object. Anything not PRESENT sorts to the TOP.
--   SECTION B — per-migration rollup. 🛑 READ FIRST.
-- ⚠️ The Supabase SQL Editor shows only the LAST statement's result. Run the file once for
-- Section B; to see Section A, run the file up to and including its first semicolon.
--
-- ⚠️ "MISSING" MEANS "NOT FOUND BY THIS QUERY". If the script errors, that is not evidence of
-- absence — re-run rather than concluding.
-- ═══════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION A — OBJECT BY OBJECT
-- ═══════════════════════════════════════════════════════════════════════════════════════
WITH
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

-- ── FUNCTIONS: signature AND body ─────────────────────────────────────────────────────
-- `body_marker` is a string that appears in the CURRENT canonical body. For the three
-- superseded functions it was verified to appear in the current body and NOT in any older
-- one, so it discriminates rather than merely existing. `superseded` marks those three.
expected_functions (sprint, fn, expected_args, body_marker, superseded, supersede_note, migration) AS (
  VALUES
  (2, 'try_claim_proof_pass',           'uuid',                   'proof_started_at',               true,  'supersedes 20260822',            '20260826_proof_started_at'),
  (2, 'try_reserve_proof_records',      'uuid, integer',          'budget',                         false, '',                               '20260822_free_proof_acquisition'),
  (2, 'release_proof_records',          'uuid, integer',          'reservation',                    false, '',                               '20260822_free_proof_acquisition'),
  (3, 'claim_programme_batch',          'uuid, integer, integer', 'FOR UPDATE',                     false, '',                               '20260829_programme_delivery_control'),
  (3, 'settle_programme_batch',         'uuid, integer',          'delivered',                      false, '',                               '20260828_programme_money_engine'),
  (3, 'try_spend_sourcing',             'uuid, integer, uuid',    'try_reserve_programme_sourcing', true,  'supersedes 20260711, 20260828',  '20260907_programme_sourcing_authority'),
  (3, 'try_reserve_programme_sourcing', 'uuid, integer',          'sourced_reserved',               false, '',                               '20260907_programme_sourcing_authority'),
  (3, 'reconcile_programme_sourcing',   'uuid',                   'v_unjudged',                     true,  'supersedes 20260907',            '20260909_programme_qualification')
),

-- ── INDEXES: table, columns, UNIQUE, partial predicate ────────────────────────────────
-- Every fingerprint below was rendered by PostgreSQL from the canonical DDL, not written by
-- hand. An empty predicate means the index is deliberately NOT partial.
expected_indexes (sprint, idx, tbl, is_unique, cols_fp, pred_fp, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts_open_idx',    'onboarding_brief_drafts', false, 'created_at desc',            'promoted_client_id is null',                                                  '20260911_onboarding_brief_drafts'),
  (1, 'figsy_sent_emails_client_id_idx',     'figsy_sent_emails',       false, 'client_id',                  '',                                                                            '20260806_audit_columns'),
  (2, 'clients_proof_review_open_idx',       'clients',                 false, 'proof_review_requested_at',  'proof_review_requested_at is not null and proof_review_resolved_at is null',   '20260827_proof_review_handoff'),
  (2, 'leads_proof_pass_idx',                'leads',                   false, 'client_id, proof_pass',      'proof_pass is not null',                                                      '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_idx',          'leads',                   false, 'client_id, proof_batch_kind','proof_batch_kind is not null',                                                '20260911_lead_proof_batch_kind'),
  (2, 'proof_ledger_budget_month_idx',       'proof_ledger',            false, 'budget_month',               '',                                                                            '20260822_free_proof_acquisition'),
  (2, 'proof_ledger_client_idx',             'proof_ledger',            false, 'client_id, created_at desc', '',                                                                            '20260822_free_proof_acquisition'),
  (3, 'figsy_sequences_campaign_idx',        'figsy_sequences',         false, 'campaign_id',                'campaign_id is not null',                                                     '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments_sequence_idx',      'figsy_enrollments',       false, 'sequence_id',                'sequence_id is not null',                                                     '20260908_review_freeze_and_schedule'),
  (3, 'leads_qualified_idx',                 'leads',                   false, 'programme_id, batch_id',     'qualified_at is not null',                                                    '20260909_programme_qualification'),
  (3, 'leads_unjudged_candidates_idx',       'leads',                   false, 'programme_id',               'programme_id is not null and qualified_at is null and disqualified_at is null','20260909_programme_qualification'),
  (3, 'icps_programme_idx',                  'icps',                    false, 'programme_id',               '',                                                                            '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_idx',   'partner_commissions',     false, 'programme_id',               'programme_id is not null',                                                    '20260828_programme_money_engine'),
  (3, 'programme_batches_programme_idx',     'programme_batches',       false, 'programme_id, created_at',   '',                                                                            '20260828_programme_money_engine'),
  (3, 'programme_batches_seq_uidx',          'programme_batches',       true,  'programme_id, seq',          '',                                                                            '20260828_programme_money_engine'),
  (3, 'programme_batches_stranded_idx',      'programme_batches',       false, 'status',                     'status = stranded',                                                           '20260828_programme_money_engine'),
  (3, 'programmes_client_idx',               'programmes',              false, 'client_id',                  '',                                                                            '20260828_programme_money_engine'),
  (3, 'programmes_first_ref_uidx',           'programmes',              true,  'first_payment_ref',          'first_payment_ref is not null',                                               '20260828_programme_money_engine'),
  (3, 'programmes_one_open_per_client_uidx', 'programmes',              true,  'client_id',                  'status <> all array[ completed , cancelled ]',                                '20260828_programme_money_engine'),
  (3, 'programmes_second_ref_uidx',          'programmes',              true,  'second_payment_ref',         'second_payment_ref is not null',                                              '20260828_programme_money_engine'),
  (3, 'programmes_status_idx',               'programmes',              false, 'status',                     '',                                                                            '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_idx',       'sourcing_ledger',         false, 'programme_id',               'programme_id is not null',                                                    '20260828_programme_money_engine'),
  (3, 'leads_batch_idx',                     'leads',                   false, 'batch_id',                   'batch_id is not null',                                                        '20260829_programme_delivery_control'),
  (3, 'leads_programme_idx',                 'leads',                   false, 'programme_id',               'programme_id is not null',                                                    '20260829_programme_delivery_control'),
  (3, 'programme_batches_one_running_uidx',  'programme_batches',       true,  'programme_id',               'status = running',                                                            '20260829_programme_delivery_control'),
  (3, 'programmes_review_open_idx',          'programmes',              false, 'review_required_at',         'review_required_at is not null and review_resolved_at is null',               '20260829_programme_delivery_control'),
  (3, 'client_inboxes_client_id_idx',        'client_inboxes',          false, 'client_id',                  '',                                                                            '20260725_client_inboxes'),
  (3, 'client_inboxes_status_idx',           'client_inboxes',          false, 'status',                     '',                                                                            '20260725_client_inboxes'),
  (3, 'client_inboxes_one_live_per_kind',    'client_inboxes',          true,  'client_id, kind',            'status = any array[ assigned , warming , active ]',                           '20260725_client_inboxes')
),

-- ── CONSTRAINTS: table, type, full definition ─────────────────────────────────────────
-- contype: c = CHECK, f = FOREIGN KEY. Definitions rendered by PostgreSQL from the canonical
-- DDL — note `IN (...)` renders as `= ANY (ARRAY[...])` and `NOT IN` as `<> ALL (ARRAY[...])`.
expected_constraints (sprint, con, tbl, contype, def_fp, migration) AS (
  VALUES
  (2, 'leads_proof_pass_check', 'leads', 'c',
      'check proof_pass is null or proof_pass = any array[1, 2]',
      '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_check', 'leads', 'c',
      'check proof_batch_kind is null or proof_batch_kind = any array[ automatic , calibrated_restart ] not valid',
      '20260911_lead_proof_batch_kind'),
  (3, 'programmes_p1_authority_xor', 'programmes', 'c',
      'check first_authorised_at is null or first_paid_at is null and first_payment_ref is null and first_payment_intent_id is null',
      '20260902_programme_internal_authority'),
  (3, 'programmes_p2_authority_xor', 'programmes', 'c',
      'check second_authorised_at is null or second_paid_at is null and second_payment_ref is null and second_payment_intent_id is null',
      '20260902_programme_internal_authority'),
  (3, 'programmes_status_check', 'programmes', 'c',
      'check status = any array[ draft , recommended , awaiting_first_payment , sourcing_authorised , sourcing , ready_for_approval , approved , live , completed , cancelled ]',
      '20260828_programme_money_engine'),
  (3, 'programmes_positive_check', 'programmes', 'c',
      'check meeting_target > 0 and recommended_volume > 0 and price_per_meeting_cents > 0 and price_total_cents > 0 and first_payment_cents > 0 and second_payment_cents > 0 and sourcing_ceiling >= 0 and sourced_used >= 0 and sourced_reserved >= 0 and make_whole_cents >= 0',
      '20260828_programme_money_engine'),
  (3, 'programmes_ceiling_check', 'programmes', 'c',
      'check sourced_used + sourced_reserved <= sourcing_ceiling',
      '20260828_programme_money_engine'),
  (3, 'programmes_payment_split_check', 'programmes', 'c',
      'check first_payment_cents + second_payment_cents = price_total_cents',
      '20260828_programme_money_engine'),
  (3, 'programmes_pause_reason_check', 'programmes', 'c',
      'check pause_reason is null or pause_reason = any array[ client , quality , icp_change ]',
      '20260828_programme_money_engine'),
  (3, 'programme_batches_status_check', 'programme_batches', 'c',
      'check status = any array[ running , served , released , stranded ]',
      '20260828_programme_money_engine'),
  (3, 'programme_batches_positive_check', 'programme_batches', 'c',
      'check requested > 0 and granted >= 0 and delivered is null or delivered >= 0',
      '20260828_programme_money_engine'),
  (3, 'icps_programme_fk', 'icps', 'f',
      'foreign key programme_id references programmes id on delete set null',
      '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_fk', 'sourcing_ledger', 'f',
      'foreign key programme_id references programmes id on delete set null',
      '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_fk', 'partner_commissions', 'f',
      'foreign key programme_id references programmes id on delete set null',
      '20260828_programme_money_engine'),
  (3, 'partner_commissions_basis_check', 'partner_commissions', 'c',
      'check basis is null or basis = any array[ lead_sale , programme_contribution ]',
      '20260828_programme_money_engine')
),

-- ── RLS POLICIES: command AND expressions ─────────────────────────────────────────────
-- 🛑 A POLICY WITH `USING (true)` IS AN OPEN TABLE WEARING A POLICY'S NAME. The expressions
-- are what make this table private, so the expressions are what get checked.
expected_policies (sprint, tbl, policy, expected_cmd, using_fp, check_fp, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', 'own brief draft readable', 'SELECT', 'user_id = auth.uid', '',                   '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'own brief draft writable', 'UPDATE', 'user_id = auth.uid', 'user_id = auth.uid', '20260911_onboarding_brief_drafts')
),

-- ═══ RESOLUTION ═══════════════════════════════════════════════════════════════════════
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
           WHEN 'user-defined'                THEN lower(c.udt_name)
           WHEN 'array'                       THEN lower(c.udt_name)
           ELSE lower(c.data_type)
         END AS norm_type
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
),

-- The same normaliser applied to live index definitions: strip casts, collapse parens/quotes/
-- whitespace, lowercase, trim. Operators and keywords survive.
live_indexes AS (
  SELECT i.indexname, i.tablename,
         (i.indexdef LIKE 'CREATE UNIQUE%') AS is_unique,
         btrim(lower(regexp_replace(regexp_replace(
           substring(split_part(i.indexdef, ' WHERE ', 1) from '\((.*)\)$'),
           '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS cols_fp,
         btrim(lower(regexp_replace(regexp_replace(
           coalesce(substring(i.indexdef from ' WHERE (.*)$'), ''),
           '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS pred_fp,
         i.indexdef
    FROM pg_catalog.pg_indexes i
   WHERE i.schemaname = 'public'
),
live_constraints AS (
  SELECT co.conname, cl.relname AS tbl, co.contype::text AS contype, co.convalidated,
         btrim(lower(regexp_replace(regexp_replace(
           pg_get_constraintdef(co.oid),
           '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS def_fp,
         pg_get_constraintdef(co.oid) AS rawdef
    FROM pg_catalog.pg_constraint co
    JOIN pg_catalog.pg_namespace ns ON ns.oid = co.connamespace
    LEFT JOIN pg_catalog.pg_class cl ON cl.oid = co.conrelid
   WHERE ns.nspname = 'public'
),
live_functions AS (
  SELECT pr.proname, lower(oidvectortypes(pr.proargtypes)) AS args,
         pg_get_function_identity_arguments(pr.oid) AS ident_args,
         pg_get_functiondef(pr.oid) AS def
    FROM pg_catalog.pg_proc pr
    JOIN pg_catalog.pg_namespace ns ON ns.oid = pr.pronamespace
   WHERE ns.nspname = 'public' AND pr.prokind = 'f'
),
live_policies AS (
  SELECT p.tablename, p.policyname, upper(p.cmd) AS cmd, p.roles,
         btrim(lower(regexp_replace(regexp_replace(coalesce(p.qual, ''),       '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS using_fp,
         btrim(lower(regexp_replace(regexp_replace(coalesce(p.with_check, ''), '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS check_fp,
         p.qual, p.with_check
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public'
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
r_columns AS (
  SELECT e.sprint, e.migration,
         e.tbl || '.' || e.col AS required_object, e.expected_type,
         CASE WHEN n.column_name IS NULL                 THEN '*** MISSING ***'
              WHEN n.norm_type <> lower(e.expected_type) THEN '*** TYPE MISMATCH ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN n.column_name IS NULL THEN 'apply: ' || e.migration
              WHEN n.norm_type <> lower(e.expected_type)
                THEN 'EXPECTED ' || e.expected_type || ' — FOUND ' || n.data_type
                     || COALESCE('(' || n.character_maximum_length || ')', '')
                     || ' · cannot hold what the code writes'
              ELSE n.data_type || COALESCE('(' || n.character_maximum_length || ')', '')
                   || ' · nullable=' || n.is_nullable
                   || COALESCE(' · default=' || left(n.column_default, 40), '')
         END AS actual_detail
  FROM expected_columns e
  LEFT JOIN norm_columns n ON n.table_name = e.tbl AND n.column_name = e.col
),

-- 🛑 SIGNATURE *AND* BODY. CREATE OR REPLACE keeps the name and arguments and swaps the logic,
-- so a signature check alone cannot see an old body deployed under the current signature.
r_functions AS (
  SELECT e.sprint, e.migration,
         'FUNCTION    ' || e.fn || '(' || e.expected_args || ')' AS required_object,
         CASE WHEN e.superseded THEN 'function (body checked — ' || e.supersede_note || ')'
              ELSE 'function (body checked)' END AS expected_type,
         CASE WHEN NOT EXISTS (SELECT 1 FROM live_functions f WHERE f.proname = e.fn)
                THEN '*** MISSING ***'
              WHEN NOT EXISTS (
                SELECT 1 FROM live_functions f
                 WHERE f.proname = e.fn
                   AND replace(f.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
              ) THEN '*** SIGNATURE MISMATCH ***'
              WHEN NOT EXISTS (
                SELECT 1 FROM live_functions f
                 WHERE f.proname = e.fn
                   AND replace(f.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
                   AND f.def ILIKE '%' || e.body_marker || '%'
              ) THEN '*** FUNCTION MISMATCH (old body) ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN NOT EXISTS (SELECT 1 FROM live_functions f WHERE f.proname = e.fn)
                THEN 'apply: ' || e.migration
              WHEN NOT EXISTS (
                SELECT 1 FROM live_functions f
                 WHERE f.proname = e.fn
                   AND replace(f.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
              ) THEN 'EXPECTED (' || e.expected_args || ') — FOUND ('
                   || (SELECT string_agg(f.ident_args, ' | ') FROM live_functions f WHERE f.proname = e.fn)
                   || ') · the RPC will not resolve at call time'
              WHEN NOT EXISTS (
                SELECT 1 FROM live_functions f
                 WHERE f.proname = e.fn
                   AND replace(f.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
                   AND f.def ILIKE '%' || e.body_marker || '%'
              ) THEN 'RIGHT NAME AND ARGUMENTS, WRONG BODY — the deployed definition does not '
                   || 'contain "' || e.body_marker || '", which the current one does. '
                   || 'This is an OLD version still deployed. Re-apply: ' || e.migration
              ELSE 'signature and body marker "' || e.body_marker || '" both match'
         END AS actual_detail
  FROM expected_functions e
),

-- 🛑 DEFINITION, NOT NAME. Wrong table, wrong columns, missing UNIQUE or a different partial
-- predicate all mean the guard the code relies on is not there.
r_indexes AS (
  SELECT e.sprint, e.migration,
         'INDEX       ' || e.idx AS required_object,
         CASE WHEN e.is_unique THEN 'unique index (correctness guard)' ELSE 'index' END AS expected_type,
         CASE WHEN l.indexname IS NULL THEN '*** MISSING ***'
              WHEN l.tablename <> e.tbl
                OR l.is_unique <> e.is_unique
                OR l.cols_fp   <> e.cols_fp
                OR l.pred_fp   <> e.pred_fp THEN '*** INDEX MISMATCH ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN l.indexname IS NULL THEN 'apply: ' || e.migration
              WHEN l.tablename <> e.tbl
                OR l.is_unique <> e.is_unique
                OR l.cols_fp   <> e.cols_fp
                OR l.pred_fp   <> e.pred_fp
                THEN 'EXPECTED on ' || e.tbl || ' (' || e.cols_fp || ')'
                     || CASE WHEN e.is_unique THEN ' UNIQUE' ELSE '' END
                     || CASE WHEN e.pred_fp <> '' THEN ' WHERE ' || e.pred_fp ELSE ' (not partial)' END
                     || '  —  FOUND: ' || l.indexdef
              ELSE 'on ' || l.tablename || ' (' || l.cols_fp || ')'
                   || CASE WHEN l.is_unique THEN ' · UNIQUE' ELSE '' END
                   || CASE WHEN l.pred_fp <> '' THEN ' · WHERE ' || l.pred_fp ELSE '' END
         END AS actual_detail
  FROM expected_indexes e
  LEFT JOIN live_indexes l ON l.indexname = e.idx
),

-- 🛑 A BROADER CHECK IS THE MOST DANGEROUS KIND OF WRONG. `proof_pass IN (1,2,3)` is
-- name-identical to `IN (1,2)` and silently permits a third automatic proof pass.
r_constraints AS (
  SELECT e.sprint, e.migration,
         'CONSTRAINT  ' || e.con AS required_object,
         CASE e.contype WHEN 'c' THEN 'CHECK constraint' WHEN 'f' THEN 'FOREIGN KEY' ELSE 'constraint' END AS expected_type,
         CASE WHEN l.conname IS NULL THEN '*** MISSING ***'
              WHEN l.tbl     <> e.tbl
                OR l.contype <> e.contype
                OR l.def_fp  <> e.def_fp THEN '*** CONSTRAINT MISMATCH ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN l.conname IS NULL THEN 'apply: ' || e.migration
              WHEN l.tbl     <> e.tbl
                OR l.contype <> e.contype
                OR l.def_fp  <> e.def_fp
                THEN 'EXPECTED on ' || e.tbl || ': ' || e.def_fp
                     || '  —  FOUND on ' || COALESCE(l.tbl, '(unknown)') || ': ' || l.rawdef
              ELSE 'on ' || l.tbl || ' · validated=' || l.convalidated::text || ' · ' || l.rawdef
         END AS actual_detail
  FROM expected_constraints e
  LEFT JOIN live_constraints l ON l.conname = e.con
),

r_rls_enabled AS (
  SELECT DISTINCT e.sprint, e.migration,
         'RLS ENABLED ' || e.tbl AS required_object,
         'row level security' AS expected_type,
         CASE WHEN c.relname IS NULL THEN '*** MISSING ***'
              WHEN c.relrowsecurity  THEN 'PRESENT'
              ELSE '*** RLS NOT ENABLED ***' END AS presence,
         CASE WHEN c.relname IS NULL THEN 'apply: ' || e.migration
              WHEN c.relrowsecurity THEN 'row level security is ON'
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
         CASE WHEN l.policyname IS NULL       THEN '*** MISSING ***'
              WHEN l.cmd <> e.expected_cmd    THEN '*** WRONG COMMAND ***'
              WHEN l.using_fp <> e.using_fp
                OR l.check_fp <> e.check_fp   THEN '*** POLICY EXPRESSION MISMATCH ***'
              ELSE 'PRESENT' END AS presence,
         CASE WHEN l.policyname IS NULL THEN 'apply: ' || e.migration
              WHEN l.cmd <> e.expected_cmd
                THEN 'EXPECTED FOR ' || e.expected_cmd || ' — FOUND FOR ' || l.cmd
              WHEN l.using_fp <> e.using_fp OR l.check_fp <> e.check_fp
                THEN 'EXPECTED using=' || COALESCE(NULLIF(e.using_fp, ''), '(none)')
                     || ' check=' || COALESCE(NULLIF(e.check_fp, ''), '(none)')
                     || '  —  FOUND using=' || COALESCE(NULLIF(l.qual, ''), '(none)')
                     || ' check=' || COALESCE(NULLIF(l.with_check, ''), '(none)')
                     || ' · a policy that does not restrict by user is not protection'
              ELSE 'FOR ' || l.cmd || ' TO ' || array_to_string(l.roles, ',')
                   || ' · using=' || COALESCE(NULLIF(l.qual, ''), '(none)')
                   || ' · check=' || COALESCE(NULLIF(l.with_check, ''), '(none)')
         END AS actual_detail
  FROM expected_policies e
  LEFT JOIN live_policies l ON l.tablename = e.tbl AND l.policyname = e.policy
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
 ORDER BY CASE WHEN presence = 'PRESENT' THEN 1 ELSE 0 END, sprint, required_object;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SECTION B — PER-MIGRATION ROLLUP.  🛑 READ THIS ONE FIRST.
--
-- ⚠️ THE STATE IS "MVP1 OBJECTS VALIDATED", NOT "COMPLETE", AND THE DIFFERENCE IS DELIBERATE.
-- It means: every object MVP1 RELIES ON from that migration is present AND correctly shaped —
-- right type, right index definition, right constraint expression, right function body, right
-- policy expression. It does NOT prove the migration file ran in full: a migration also writes
-- comments, grants and objects outside MVP1's dependency set, and none of those are checked.
--
-- *** PARTIAL *** is the dangerous state. The runner applies a migration as one statement
-- batch, so a CREATE UNIQUE INDEX that fails on pre-existing duplicate rows leaves the columns
-- added and the guard absent — and every column-level check then passes.
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
expected_functions (sprint, fn, expected_args, body_marker, superseded, supersede_note, migration) AS (
  VALUES
  (2, 'try_claim_proof_pass',           'uuid',                   'proof_started_at',               true,  'supersedes 20260822',            '20260826_proof_started_at'),
  (2, 'try_reserve_proof_records',      'uuid, integer',          'budget',                         false, '',                               '20260822_free_proof_acquisition'),
  (2, 'release_proof_records',          'uuid, integer',          'reservation',                    false, '',                               '20260822_free_proof_acquisition'),
  (3, 'claim_programme_batch',          'uuid, integer, integer', 'FOR UPDATE',                     false, '',                               '20260829_programme_delivery_control'),
  (3, 'settle_programme_batch',         'uuid, integer',          'delivered',                      false, '',                               '20260828_programme_money_engine'),
  (3, 'try_spend_sourcing',             'uuid, integer, uuid',    'try_reserve_programme_sourcing', true,  'supersedes 20260711, 20260828',  '20260907_programme_sourcing_authority'),
  (3, 'try_reserve_programme_sourcing', 'uuid, integer',          'sourced_reserved',               false, '',                               '20260907_programme_sourcing_authority'),
  (3, 'reconcile_programme_sourcing',   'uuid',                   'v_unjudged',                     true,  'supersedes 20260907',            '20260909_programme_qualification')
),
expected_indexes (sprint, idx, tbl, is_unique, cols_fp, pred_fp, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts_open_idx',    'onboarding_brief_drafts', false, 'created_at desc',            'promoted_client_id is null',                                                  '20260911_onboarding_brief_drafts'),
  (1, 'figsy_sent_emails_client_id_idx',     'figsy_sent_emails',       false, 'client_id',                  '',                                                                            '20260806_audit_columns'),
  (2, 'clients_proof_review_open_idx',       'clients',                 false, 'proof_review_requested_at',  'proof_review_requested_at is not null and proof_review_resolved_at is null',   '20260827_proof_review_handoff'),
  (2, 'leads_proof_pass_idx',                'leads',                   false, 'client_id, proof_pass',      'proof_pass is not null',                                                      '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_idx',          'leads',                   false, 'client_id, proof_batch_kind','proof_batch_kind is not null',                                                '20260911_lead_proof_batch_kind'),
  (2, 'proof_ledger_budget_month_idx',       'proof_ledger',            false, 'budget_month',               '',                                                                            '20260822_free_proof_acquisition'),
  (2, 'proof_ledger_client_idx',             'proof_ledger',            false, 'client_id, created_at desc', '',                                                                            '20260822_free_proof_acquisition'),
  (3, 'figsy_sequences_campaign_idx',        'figsy_sequences',         false, 'campaign_id',                'campaign_id is not null',                                                     '20260907_preparation_snapshot'),
  (3, 'figsy_enrollments_sequence_idx',      'figsy_enrollments',       false, 'sequence_id',                'sequence_id is not null',                                                     '20260908_review_freeze_and_schedule'),
  (3, 'leads_qualified_idx',                 'leads',                   false, 'programme_id, batch_id',     'qualified_at is not null',                                                    '20260909_programme_qualification'),
  (3, 'leads_unjudged_candidates_idx',       'leads',                   false, 'programme_id',               'programme_id is not null and qualified_at is null and disqualified_at is null','20260909_programme_qualification'),
  (3, 'icps_programme_idx',                  'icps',                    false, 'programme_id',               '',                                                                            '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_idx',   'partner_commissions',     false, 'programme_id',               'programme_id is not null',                                                    '20260828_programme_money_engine'),
  (3, 'programme_batches_programme_idx',     'programme_batches',       false, 'programme_id, created_at',   '',                                                                            '20260828_programme_money_engine'),
  (3, 'programme_batches_seq_uidx',          'programme_batches',       true,  'programme_id, seq',          '',                                                                            '20260828_programme_money_engine'),
  (3, 'programme_batches_stranded_idx',      'programme_batches',       false, 'status',                     'status = stranded',                                                           '20260828_programme_money_engine'),
  (3, 'programmes_client_idx',               'programmes',              false, 'client_id',                  '',                                                                            '20260828_programme_money_engine'),
  (3, 'programmes_first_ref_uidx',           'programmes',              true,  'first_payment_ref',          'first_payment_ref is not null',                                               '20260828_programme_money_engine'),
  (3, 'programmes_one_open_per_client_uidx', 'programmes',              true,  'client_id',                  'status <> all array[ completed , cancelled ]',                                '20260828_programme_money_engine'),
  (3, 'programmes_second_ref_uidx',          'programmes',              true,  'second_payment_ref',         'second_payment_ref is not null',                                              '20260828_programme_money_engine'),
  (3, 'programmes_status_idx',               'programmes',              false, 'status',                     '',                                                                            '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_idx',       'sourcing_ledger',         false, 'programme_id',               'programme_id is not null',                                                    '20260828_programme_money_engine'),
  (3, 'leads_batch_idx',                     'leads',                   false, 'batch_id',                   'batch_id is not null',                                                        '20260829_programme_delivery_control'),
  (3, 'leads_programme_idx',                 'leads',                   false, 'programme_id',               'programme_id is not null',                                                    '20260829_programme_delivery_control'),
  (3, 'programme_batches_one_running_uidx',  'programme_batches',       true,  'programme_id',               'status = running',                                                            '20260829_programme_delivery_control'),
  (3, 'programmes_review_open_idx',          'programmes',              false, 'review_required_at',         'review_required_at is not null and review_resolved_at is null',               '20260829_programme_delivery_control'),
  (3, 'client_inboxes_client_id_idx',        'client_inboxes',          false, 'client_id',                  '',                                                                            '20260725_client_inboxes'),
  (3, 'client_inboxes_status_idx',           'client_inboxes',          false, 'status',                     '',                                                                            '20260725_client_inboxes'),
  (3, 'client_inboxes_one_live_per_kind',    'client_inboxes',          true,  'client_id, kind',            'status = any array[ assigned , warming , active ]',                           '20260725_client_inboxes')
),
expected_constraints (sprint, con, tbl, contype, def_fp, migration) AS (
  VALUES
  (2, 'leads_proof_pass_check', 'leads', 'c',
      'check proof_pass is null or proof_pass = any array[1, 2]', '20260903_lead_proof_attribution'),
  (2, 'leads_proof_batch_kind_check', 'leads', 'c',
      'check proof_batch_kind is null or proof_batch_kind = any array[ automatic , calibrated_restart ] not valid', '20260911_lead_proof_batch_kind'),
  (3, 'programmes_p1_authority_xor', 'programmes', 'c',
      'check first_authorised_at is null or first_paid_at is null and first_payment_ref is null and first_payment_intent_id is null', '20260902_programme_internal_authority'),
  (3, 'programmes_p2_authority_xor', 'programmes', 'c',
      'check second_authorised_at is null or second_paid_at is null and second_payment_ref is null and second_payment_intent_id is null', '20260902_programme_internal_authority'),
  (3, 'programmes_status_check', 'programmes', 'c',
      'check status = any array[ draft , recommended , awaiting_first_payment , sourcing_authorised , sourcing , ready_for_approval , approved , live , completed , cancelled ]', '20260828_programme_money_engine'),
  (3, 'programmes_positive_check', 'programmes', 'c',
      'check meeting_target > 0 and recommended_volume > 0 and price_per_meeting_cents > 0 and price_total_cents > 0 and first_payment_cents > 0 and second_payment_cents > 0 and sourcing_ceiling >= 0 and sourced_used >= 0 and sourced_reserved >= 0 and make_whole_cents >= 0', '20260828_programme_money_engine'),
  (3, 'programmes_ceiling_check', 'programmes', 'c',
      'check sourced_used + sourced_reserved <= sourcing_ceiling', '20260828_programme_money_engine'),
  (3, 'programmes_payment_split_check', 'programmes', 'c',
      'check first_payment_cents + second_payment_cents = price_total_cents', '20260828_programme_money_engine'),
  (3, 'programmes_pause_reason_check', 'programmes', 'c',
      'check pause_reason is null or pause_reason = any array[ client , quality , icp_change ]', '20260828_programme_money_engine'),
  (3, 'programme_batches_status_check', 'programme_batches', 'c',
      'check status = any array[ running , served , released , stranded ]', '20260828_programme_money_engine'),
  (3, 'programme_batches_positive_check', 'programme_batches', 'c',
      'check requested > 0 and granted >= 0 and delivered is null or delivered >= 0', '20260828_programme_money_engine'),
  (3, 'icps_programme_fk', 'icps', 'f',
      'foreign key programme_id references programmes id on delete set null', '20260828_programme_money_engine'),
  (3, 'sourcing_ledger_programme_fk', 'sourcing_ledger', 'f',
      'foreign key programme_id references programmes id on delete set null', '20260828_programme_money_engine'),
  (3, 'partner_commissions_programme_fk', 'partner_commissions', 'f',
      'foreign key programme_id references programmes id on delete set null', '20260828_programme_money_engine'),
  (3, 'partner_commissions_basis_check', 'partner_commissions', 'c',
      'check basis is null or basis = any array[ lead_sale , programme_contribution ]', '20260828_programme_money_engine')
),
expected_policies (sprint, tbl, policy, expected_cmd, using_fp, check_fp, migration) AS (
  VALUES
  (1, 'onboarding_brief_drafts', 'own brief draft readable', 'SELECT', 'user_id = auth.uid', '',                   '20260911_onboarding_brief_drafts'),
  (1, 'onboarding_brief_drafts', 'own brief draft writable', 'UPDATE', 'user_id = auth.uid', 'user_id = auth.uid', '20260911_onboarding_brief_drafts')
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
live_indexes AS (
  SELECT i.indexname, i.tablename,
         (i.indexdef LIKE 'CREATE UNIQUE%') AS is_unique,
         btrim(lower(regexp_replace(regexp_replace(
           substring(split_part(i.indexdef, ' WHERE ', 1) from '\((.*)\)$'),
           '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS cols_fp,
         btrim(lower(regexp_replace(regexp_replace(
           coalesce(substring(i.indexdef from ' WHERE (.*)$'), ''),
           '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS pred_fp
    FROM pg_catalog.pg_indexes i
   WHERE i.schemaname = 'public'
),
live_constraints AS (
  SELECT co.conname, cl.relname AS tbl, co.contype::text AS contype,
         btrim(lower(regexp_replace(regexp_replace(
           pg_get_constraintdef(co.oid),
           '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS def_fp
    FROM pg_catalog.pg_constraint co
    JOIN pg_catalog.pg_namespace ns ON ns.oid = co.connamespace
    LEFT JOIN pg_catalog.pg_class cl ON cl.oid = co.conrelid
   WHERE ns.nspname = 'public'
),
live_functions AS (
  SELECT pr.proname, lower(oidvectortypes(pr.proargtypes)) AS args, pg_get_functiondef(pr.oid) AS def
    FROM pg_catalog.pg_proc pr
    JOIN pg_catalog.pg_namespace ns ON ns.oid = pr.pronamespace
   WHERE ns.nspname = 'public' AND pr.prokind = 'f'
),
live_policies AS (
  SELECT p.tablename, p.policyname, upper(p.cmd) AS cmd,
         btrim(lower(regexp_replace(regexp_replace(coalesce(p.qual, ''),       '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS using_fp,
         btrim(lower(regexp_replace(regexp_replace(coalesce(p.with_check, ''), '::[a-zA-Z ]+', '', 'g'), '[()\s'']+', ' ', 'g'))) AS check_fp
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public'
),
-- Every required object reduced to (migration, ok?) — 1 only when present AND correctly shaped.
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
           SELECT 1 FROM live_functions f
            WHERE f.proname = e.fn
              AND replace(f.args, ' ', '') = replace(lower(e.expected_args), ' ', '')
              AND f.def ILIKE '%' || e.body_marker || '%'
         ) THEN 1 ELSE 0 END
    FROM expected_functions e
  UNION ALL
  SELECT e.sprint, e.migration,
         CASE WHEN l.indexname IS NOT NULL
               AND l.tablename = e.tbl AND l.is_unique = e.is_unique
               AND l.cols_fp = e.cols_fp AND l.pred_fp = e.pred_fp THEN 1 ELSE 0 END
    FROM expected_indexes e
    LEFT JOIN live_indexes l ON l.indexname = e.idx
  UNION ALL
  SELECT e.sprint, e.migration,
         CASE WHEN l.conname IS NOT NULL
               AND l.tbl = e.tbl AND l.contype = e.contype AND l.def_fp = e.def_fp THEN 1 ELSE 0 END
    FROM expected_constraints e
    LEFT JOIN live_constraints l ON l.conname = e.con
  UNION ALL
  SELECT e.sprint, e.migration,
         CASE WHEN l.policyname IS NOT NULL AND l.cmd = e.expected_cmd
               AND l.using_fp = e.using_fp AND l.check_fp = e.check_fp THEN 1 ELSE 0 END
    FROM expected_policies e
    LEFT JOIN live_policies l ON l.tablename = e.tbl AND l.policyname = e.policy
  UNION ALL
  SELECT DISTINCT e.sprint, e.migration, CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END
    FROM expected_policies e
    LEFT JOIN pg_catalog.pg_class c
           ON c.relname = e.tbl
          AND c.relnamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
)
SELECT 'B' AS section,
       min(sprint) AS earliest_sprint,
       CASE WHEN sum(ok) = count(*) THEN 'MVP1 OBJECTS VALIDATED'
            WHEN sum(ok) = 0        THEN '*** NOT APPLIED ***'
            ELSE '*** PARTIAL ***' END AS migration_state,
       migration,
       count(*)           AS objects_required,
       sum(ok)            AS objects_validated,
       count(*) - sum(ok) AS objects_failing
  FROM obj
 GROUP BY migration
 ORDER BY CASE WHEN sum(ok) = count(*) THEN 2
               WHEN sum(ok) = 0        THEN 1
               ELSE 0 END,
          migration;
