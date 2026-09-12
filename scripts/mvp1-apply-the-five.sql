-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MVP1 — APPLY THE FIVE MISSING MIGRATIONS.
--
-- 🛑 NOT AUTHORISED TO RUN BY THE EXISTENCE OF THIS FILE. It is committed so that the SQL
-- that would run is reviewed, committed and repeatable BEFORE anyone runs it. Read the
-- "TWO LOCKS IN CONFLICT" note below first — the founder has to resolve it, not this file.
--
-- The five the probe reported NOT APPLIED, in the reviewed order, VERBATIM from their
-- canonical files in supabase/migrations/. Nothing here was retyped or paraphrased —
-- each block is the file, concatenated.
--
-- ── 🛑 TWO LOCKS IN CONFLICT, AND ONLY THE FOUNDER CAN BREAK THE TIE ────────────────────
--
--   ① The MVP1 production authorisation: "DO NOT run the full 64-migration runner… apply
--      ONLY the exact missing MVP1 migrations." `runPendingMigrations()` has no key filter,
--      no applied-ledger and no skip — pending-migrations.ts:4612 loops the whole array and
--      executes every one of the 64 unconditionally. There is no subset to select.
--
--   ② O3, stated in pending-migrations.ts: "no ad-hoc SQL, ever — not in the dashboard's
--      SQL editor, not anywhere. A reachable SQL editor is a place to LOOK, never a place
--      to RUN."
--
-- Together they close every door. The file exists to make the third door visible rather
-- than to walk through one: O3's own stated justification is that the runner's statements
-- are "REVIEWED, COMMITTED and IDEMPOTENT" and that editor SQL is "unreviewed, uncommitted,
-- unrepeatable and invisible to every check in this repo". This script is reviewed,
-- committed, idempotent and in the repo — it meets O3's reasons while not meeting its
-- letter. That is an argument, not a permission. The cleanest resolution is a key filter on
-- the runner, which is product build work and therefore frozen.
--
-- ── 🛑 ONE TRANSACTION, AND THAT IS THE POINT ───────────────────────────────────────────
--
-- The sanctioned runner applies each migration in its own connection, so a failure part-way
-- leaves some applied and some not — the *** PARTIAL *** state the probe exists to catch,
-- and the most dangerous one there is, because every column-level check passes while a
-- guard is missing.
--
-- Every statement in these five is transactional DDL (no CREATE INDEX CONCURRENTLY, no
-- CREATE EXTENSION, no VACUUM), so all five can be wrapped. Either all five land or none
-- does. There is no partial outcome to diagnose.
--
-- ⚠️ WHAT THIS DOES NOT DO: it writes no existing row, drops nothing, renames nothing,
-- backfills nothing, and touches none of the other 59 migrations.
--
-- ── VALIDATED ON A THROWAWAY POSTGRES 16, NOT ON PRODUCTION (CODE VERIFIED) ─────────────
--
-- Against a minimal base carrying only what these five depend on (icps, clients, programmes,
-- leads, auth.users, auth.uid(), uuid-ossp, the authenticated role):
--   · probe BEFORE  → all five *** NOT APPLIED ***, same verdicts production returned
--   · apply         → exit 0
--   · probe AFTER   → all five MVP1 OBJECTS VALIDATED, 0 problems across 28 objects
--   · re-apply      → exit 0, still all validated, leads_proof_batch_kind_check count = 1
--   · TEETH: one statement deliberately broken mid-script → the whole thing rolls back and
--     ZERO of the 28 objects land; the restored script then succeeds on that same database.
-- RUNTIME UNVERIFIED against production: nothing in this session has touched production.
--
-- ⚠️ AFTER RUNNING IT, RE-RUN THE PROBE. A clean run with no error message is not the
-- confirmation — Section B reporting all five as MVP1 OBJECTS VALIDATED is.
-- ═══════════════════════════════════════════════════════════════════════════════════════

BEGIN;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 20260911_icp_target_category_and_type
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ── MVP1 (C04, C21) — THE CLIENT'S OWN WORDS, AND THE TARGET'S ORGANISATIONAL FORM ──────
--
-- 🛑 WHAT WAS BROKEN. `icps.industries` was the ONLY place a target market could be recorded,
-- and it is a CLOSED SIXTEEN-VALUE LIST (Fintech, Healthtech, E-commerce, SaaS, Logistics,
-- Agriculture, Education, Manufacturing, Real Estate, Media, Consulting, Retail, Banking,
-- Insurance, Telecoms, Energy). A client who said "digital marketing agencies" had no home
-- for that phrase: the model either mapped it onto whichever of the sixteen seemed nearest —
-- substituting a vocabulary nobody agreed — or omitted the field, in which case the ICP
-- stored `industries: []` and the structural-fit gate returned 'yes' for every row on earth.
--
-- ⚠️ TWO COLUMNS, BECAUSE THEY ARE TWO FACTS (founder-locked).
--   · target_category     — what kind of market or business to target, IN THE CLIENT'S OWN
--                           WORDS, exactly as they said it. Authoritative. Provider taxonomy
--                           never replaces it; normalisation happens only at the provider edge.
--   · target_company_type — the organisational form of the TARGET company: agency,
--                           consultancy, clinic, recruitment firm, SaaS company. NOT a legal
--                           entity form, NOT the client's own industry, NOT a provider label,
--                           and never a model guess with no client evidence behind it.
--
-- One client utterance may supply both — "digital marketing agencies" carries the category
-- and, through the word "agencies", the type. They are still stored separately, because a
-- client who said only "digital marketing" has the first and not the second.
--
-- ⚠️ ADDITIVE AND NON-DESTRUCTIVE. `industries` is untouched and keeps doing its job as the
-- provider-edge hint that PDL and Apollo bodies already read. Nothing is dropped, nothing is
-- renamed, no data is rewritten, and there is no backfill: existing rows keep NULL, which
-- reads correctly as "this fact was never collected".
--
-- ⚠️ DEPLOYMENT ORDERING MATTERS. `icpSchema` now carries both fields and the client ICP save
-- writes them in its insert payload, so this migration must be applied BEFORE the code that
-- writes them ships. Same expand/contract rule as `clients.commercial_model`.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS target_category     text,
  ADD COLUMN IF NOT EXISTS target_company_type text;

COMMENT ON COLUMN public.icps.target_category IS
  'MVP1 brief fact 5 — the kind of market/business to target, in the CLIENT''S OWN WORDS. Never a provider label; never rewritten by normalisation.';
COMMENT ON COLUMN public.icps.target_company_type IS
  'MVP1 brief fact 7 — the organisational form of the TARGET company (agency, consultancy, clinic...). Set only from client evidence, never inferred.';

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 20260911_preparation_version
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- A FROZEN PACKAGE IS NEVER MUTATED IN PLACE — IT IS REPLACED BY A NEW VERSION.
--
-- 🛑 WHAT THE HASH ALONE COULD NOT SAY. `review_preparation_hash` proves WHETHER the package
-- changed. It cannot say HOW MANY TIMES, it cannot be spoken to a client, and — the part that
-- matters — it gives an approval no way to name a version rather than a digest. Two re-freezes
-- that happen to produce the same work produce the same hash, which is correct for drift
-- detection and useless as an identity for "the package you read".
--
-- ⚠️ A MONOTONIC COUNTER, NOT A LEDGER OF OLD PACKAGES. The founder's rule is that a change
-- makes a NEW version and the old approval does not carry forward — not that superseded
-- packages stay retrievable. The counter makes the replacement legible and auditable; keeping
-- every historical snapshot is a product decision nobody has taken.
--
-- 🛑 AND `approved_preparation_version` IS WHAT STOPS AN APPROVAL DRIFTING FORWARD. It is
-- stamped from the review version at the moment of approval, so a later re-freeze moves
-- `review_preparation_version` and leaves the approved one behind — the two numbers disagreeing
-- IS the statement "this approval does not cover the current package".
--
-- ⚠️ EXPAND ONLY. Nullable, defaulted, no backfill of approvals that predate it: a programme
-- frozen before this migration carries `review_preparation_version = NULL`, which reads as
-- "unknown version", never as version zero.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ── AND WHO APPROVED IT ────────────────────────────────────────────────────────────────
--
-- 🛑 AN APPROVAL RECORDED NO IDENTITY AT ALL. `approved_at` says when, the snapshot says what,
-- and nothing said WHO — so "the client approved this" was a claim the database could not
-- support. For the one act that turns prepared work into work we are allowed to run, that is
-- the wrong thing to be unable to answer.
--
-- ⚠️ TWO COLUMNS, BECAUSE THERE ARE TWO KINDS OF APPROVER and they carry different authority.
-- `approved_by_kind` distinguishes the CLIENT's own approval in Milla from an OPERATOR approval
-- in Vida; `approved_by_user_id` is the authenticated user behind a client approval. An
-- operator approval carries no user id — it is admin-key authority, not a session — and
-- recording one would invent a person.
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_preparation_version   int,
  ADD COLUMN IF NOT EXISTS approved_preparation_version int,
  ADD COLUMN IF NOT EXISTS approved_by_kind             text,
  ADD COLUMN IF NOT EXISTS approved_by_user_id          uuid;

COMMENT ON COLUMN public.programmes.approved_by_kind IS
  'Who approved: ''client'' (the customer, in Milla, from their own session) or ''operator'' (Vida, admin-key authority). NULL means approved before identity was recorded.';

COMMENT ON COLUMN public.programmes.approved_by_user_id IS
  'The authenticated user behind a CLIENT approval. NULL for operator approvals — admin-key authority is not a session, and recording a user id for it would invent a person.';

COMMENT ON COLUMN public.programmes.review_preparation_version IS
  'Which frozen review package this is, counting from 1 and rising by one on every re-freeze. NULL means frozen before versioning existed. Never reused, never decremented.';

COMMENT ON COLUMN public.programmes.approved_preparation_version IS
  'The review version the client actually approved. It stays put when a later re-freeze moves review_preparation_version — the two disagreeing is how an approval is known not to cover the current package.';

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 20260911_proof_restart_and_refinement
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 11 Sep (C39 / C23) — THE RESTART CAN ACTUALLY BE SPENT, AND A REFINEMENT CAN BE MEANT.
--
-- 🛑 WHAT WAS BROKEN (C39). `20260910_proof_calibration_handoff` added
-- `proof_calibrated_restart_at` — that an operator GRANTED the one human-authorised extra
-- Proof pass. Nothing recorded that the client had SPENT it, and nothing let the pass be
-- claimed: `spendDoors` answered `proof_passes_done < 2` (false at 2, for ever) and
-- `try_claim_proof_pass` refuses at 2 for ever. So the operator pressed a real button, an
-- audit row was written, and the client got nothing. The grant bought a pass that could not
-- be taken.
--
--   proof_calibrated_restart_used_at — when the granted restart was CONSUMED. Granted and
--     used are different facts: with only the first, the grant either buys nothing (the count
--     still refuses) or buys unlimited passes (it never expires). Both were live.
--
-- 🛑 AND WHAT WAS MISSING (C23). Attempt 2 is real paid sourcing against a target the client
-- is supposed to have corrected. Milla may PROPOSE what she thinks they meant; nothing
-- recorded whether they had AGREED to it, so the second and last automatic attempt could be
-- spent on the model's reading of a sentence.
--
--   proof_refinement_text         — the client's own words. Never the interpretation.
--   proof_refinement_proposed_at  — we proposed an interpreted change back to them.
--   proof_refinement_confirmed_at — they confirmed it. THIS is the gate Attempt 2 waits on.
--
-- And the audit half of the human path:
--
--   proof_calibration_resolved_by — who recorded the resolution. The operator audit log
--     already carries the action; this keeps the identity on the row an operator reads.
--
-- ⚠️ `proof_passes_done` IS NOT TOUCHED BY ANY OF THIS, and neither is `try_claim_proof_pass`.
-- The two automatic attempts are spent for ever. The calibrated restart is a separate door,
-- never a wider one, and it closes again the moment it is used.
--
-- Additive, nullable, no defaults, no backfill, idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_calibrated_restart_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_calibration_resolved_by    text,
  ADD COLUMN IF NOT EXISTS proof_refinement_text            text,
  ADD COLUMN IF NOT EXISTS proof_refinement_proposed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS proof_refinement_confirmed_at    timestamptz;

COMMENT ON COLUMN public.clients.proof_calibrated_restart_used_at IS
  'When the granted calibrated restart was CONSUMED by a Proof claim. A restart is available only while proof_calibrated_restart_at is NEWER than this, so one grant buys exactly one set. It never resets proof_passes_done and try_claim_proof_pass is untouched.';

COMMENT ON COLUMN public.clients.proof_calibration_resolved_by IS
  'The operator who recorded the human calibration resolution. The operator audit log holds the action; this keeps the identity on the row the next operator reads.';

COMMENT ON COLUMN public.clients.proof_refinement_text IS
  'What the client said to refine their targeting, IN THEIR OWN WORDS. Never the models interpretation of it, and never a provider label.';

COMMENT ON COLUMN public.clients.proof_refinement_proposed_at IS
  'When an interpreted refinement was proposed back to the client. A proposal on its own never sources: it CLOSES the improved-set door until they confirm.';

COMMENT ON COLUMN public.clients.proof_refinement_confirmed_at IS
  'When the client confirmed the interpreted refinement. This is the only thing that reopens the door to automatic Attempt 2.';

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 20260911_onboarding_brief_drafts
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ── MVP1 — THE BRIEF BEFORE THERE IS A CLIENT (C20/C21, Preview 07) ─────────────────────
--
-- 🛑 WHAT WAS BROKEN. `/auth/signup` creates an auth user and nothing else. The `clients` row
-- is created by the CONFIRM click, which also saves the ICP and starts Proof. So the entire
-- Brief conversation lived in React state in one browser tab: close it and everything Milla
-- had collected was gone, and Vida never knew the person existed.
--
-- Preview 07 — "signed up 14 minutes ago and Milla is collecting their brief", 10 of 11 facts,
-- confirmation still pending — was therefore not a state the product could reach. A client was
-- invisible to the operator until the instant they confirmed, at which point the brief was
-- complete by definition and confirmation was no longer pending.
--
-- ⚠️ THIS IS NOT A SECOND BRIEF MODEL AND NOT A SECOND LIFECYCLE AUTHORITY. It is the
-- PERSISTENCE LOCATION for the same eleven facts, before promotion. Completeness is decided
-- by `packages/shared/src/brief-facts.ts` for every reader — Milla, this table and Vida.
--
-- ⚠️ ONE AUTHORITATIVE WRITABLE STATE AT A TIME.
--   before confirmation  — the draft is the authoritative writable Brief
--   after promotion      — the clients row and the ICP are the operational truth
-- `promoted_client_id` and `confirmed_at` are what close the first: a promoted draft is
-- evidence (audit, provenance, recovery) and must never be read back as a competing mutable
-- source. The application refuses to write a promoted draft; this file records why.
--
-- ⚠️ JSONB FOR THE FACTS, DELIBERATELY. Same shape decision as
-- `programmes.calculator_assumptions`: a snapshot, read back together, never queried across
-- and never aggregated. Column-per-fact would be eleven migrations of churn for a value only
-- ever read whole — and the eleven are defined in shared code, not in the schema.
--
-- ⚠️ NO clients ROW IS CREATED, AND NO EXISTING SEMANTICS CHANGE. "A client" still means a
-- confirmed client everywhere — the worklist, the lifecycle board, every count and every
-- alert keep their meaning. Vida's rail merges drafts as a read-model projection.
--
-- ⚠️ ADDITIVE, NON-DESTRUCTIVE, IDEMPOTENT. One new table, nothing dropped, nothing renamed,
-- no backfill and no existing row written.
--
-- DEPLOYMENT ORDERING: apply before shipping the code that reads or writes it. Until it is
-- applied the draft routes fail closed — Milla keeps its in-memory behaviour exactly as today
-- and Vida's rail simply shows no drafts, which is the current product.

CREATE TABLE IF NOT EXISTS public.onboarding_brief_drafts (
  id                 uuid primary key default uuid_generate_v4(),
  -- The authenticated user. UNIQUE: one in-progress Brief per person, so a second tab
  -- resumes the same draft rather than racing a duplicate into the operator's rail.
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  -- The partial eleven-fact state. `{}` is a real and expected value: a person who has
  -- signed up and said nothing yet.
  facts              jsonb not null default '{}'::jsonb,
  -- The minimum needed to resume the conversation in another tab. Not a chat platform.
  conversation       jsonb,
  -- ⚠️ CONFIRMATION IS A SEPARATE GATE AND IS NEVER ONE OF THE ELEVEN FACTS. It is stamped
  -- when the client confirms a COMPLETE brief, and it is what starts Proof.
  confirmed_at       timestamptz,
  -- Set at promotion. Its presence is what makes this row evidence rather than truth.
  promoted_client_id uuid references public.clients(id) on delete set null,
  promoted_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Vida's rail asks for the drafts that have NOT been promoted. A partial index keeps that
-- read cheap as the table accumulates promoted evidence rows.
CREATE INDEX IF NOT EXISTS onboarding_brief_drafts_open_idx
  ON public.onboarding_brief_drafts(created_at DESC)
  WHERE promoted_client_id IS NULL;

-- ── ROW-LEVEL SECURITY ─────────────────────────────────────────────────────────────────
--
-- 🛑 THIS TABLE IS THE ONE THAT MOST NEEDS IT. Every other client table is keyed by
-- `client_id` and reached through `current_client_id()`. This one is keyed by `user_id` and
-- exists precisely for people who have NO client row — so the usual helper answers NULL for
-- exactly the rows it is meant to protect, and "no policy" would mean a person's company,
-- their contact name, their targeting and their stated outcome are readable by anyone holding
-- the public anon key that apps/portal ships to every browser.
--
-- ⚠️ THE POLICY IS `auth.uid()`, NOT `current_client_id()`, for that reason. A draft belongs
-- to an authenticated USER, before it belongs to a client.
--
-- ⚠️ SELECT AND UPDATE ONLY, AND NO INSERT POLICY ON PURPOSE. The API writes with the service
-- role, which bypasses RLS; a browser must never be able to mint a draft row directly. Read
-- and amend your own, and nothing else.
ALTER TABLE IF EXISTS public.onboarding_brief_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brief draft readable" ON public.onboarding_brief_drafts;
CREATE POLICY "own brief draft readable" ON public.onboarding_brief_drafts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own brief draft writable" ON public.onboarding_brief_drafts;
CREATE POLICY "own brief draft writable" ON public.onboarding_brief_drafts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.onboarding_brief_drafts IS
  'MVP1 pre-confirmation Brief persistence. The SAME eleven facts defined in packages/shared/src/brief-facts.ts, stored before a clients row exists. Authoritative and writable until promotion; evidence only afterwards. Not a second Brief model and not a lifecycle authority.';
COMMENT ON COLUMN public.onboarding_brief_drafts.facts IS
  'Partial eleven-fact state as a snapshot. Completeness is decided by shared code, never by this column''s shape.';
COMMENT ON COLUMN public.onboarding_brief_drafts.confirmed_at IS
  'When the client confirmed a COMPLETE brief. A separate gate — never counted as one of the eleven facts.';
COMMENT ON COLUMN public.onboarding_brief_drafts.promoted_client_id IS
  'The clients row this draft became. Once set, the draft is evidence: it may not be written again and may never compete with the confirmed client/ICP truth.';

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 20260911_lead_proof_batch_kind
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 11 Sep — THE CALIBRATED RESTART IS PROVENANCE ON THE ROW, NOT A THIRD PASS NUMBER.
--
-- 🛑 WHAT THIS REPLACES, AND IT COULD NOT HAVE WORKED. An earlier cut encoded the one
-- human-authorised calibrated restart as `leads.proof_pass = 3`, with rendering code
-- special-casing 3 into "Calibrated restart". Two things were wrong with it:
--
--   ① THE DATABASE WOULD HAVE REFUSED IT. `20260903_lead_proof_attribution` declares
--      CHECK (proof_pass IS NULL OR proof_pass IN (1, 2)). Every restart insert would have
--      failed on the constraint. The value was unreachable, not merely unwise.
--   ② IT PUT AMBIGUOUS TRUTH IN THE ROW and asked presentation code to repair it. Anything
--      reading max(proof_pass), counting attempts, guarding spend or building analytics would
--      reasonably have read 3 as a third automatic attempt — the exact product rule the
--      restart exists to respect. A special case in a label does not make persisted data
--      honest, and the next reader will not know to write one.
--
-- ⚠️ AUTOMATIC PROOF PASS IDENTITY STAYS 1 AND 2, FOR EVER, and so does the CHECK above.
-- `clients.proof_passes_done` stays 2 after both attempts AND after the restart, and
-- `try_claim_proof_pass` is untouched.
--
-- ⚠️ THE RESTART'S ROWS CARRY THE PASS THEY RAN ALONGSIDE (2) AND THIS KIND. So three history
-- events are readable — Automatic attempt 1, Automatic attempt 2, Calibrated restart — while
-- only the first two are automatic proof passes.
--
-- ⚠️ NULL MEANS 'automatic', WHICH IS THE HONEST READING OF EVERY EXISTING ROW. No default is
-- written and nothing is backfilled: a row sourced before this column existed was an
-- automatic pass, and saying so by absence is truthful rather than stamped.
--
-- Additive, nullable, no default, no backfill, idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS proof_batch_kind text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.leads'::regclass
       AND conname  = 'leads_proof_batch_kind_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_proof_batch_kind_check CHECK (
        proof_batch_kind IS NULL OR proof_batch_kind IN ('automatic', 'calibrated_restart')
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.leads.proof_batch_kind IS
  'What produced this Proof row: automatic (one of the two automatic attempts) or calibrated_restart (the one human-authorised set granted after a real calibration resolution). NULL reads as automatic, which is the honest answer for every row written before this column existed. It is the ONLY thing that tells a restart from an automatic attempt - proof_pass stays 1 or 2 for both, and clients.proof_passes_done stays 2.';

CREATE INDEX IF NOT EXISTS leads_proof_batch_kind_idx
  ON public.leads (client_id, proof_batch_kind)
  WHERE proof_batch_kind IS NOT NULL;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- Now re-run scripts/mvp1-production-schema-probe.sql. Section B must show all five as
-- MVP1 OBJECTS VALIDATED. Anything else — and especially *** PARTIAL *** — means stop.
-- ═══════════════════════════════════════════════════════════════════════════════════════
