-- ═════════════════════════════════════════════════════════════════════════════════════════
-- XC-5 + XC-6 + XC-3 · THE THREE THINGS THE SYSTEM COULD NOT WRITE DOWN
--
-- ── EXPAND / CONTRACT ───────────────────────────────────────────────────────────────────
-- **PHASE: EXPAND ONLY.** This migration ADDS three tables and their indexes. It alters no
-- existing column, drops nothing, renames nothing and rewrites no row. Every reader of
-- every existing table behaves identically before and after, so it is safe to apply while
-- the old code is still serving, and safe to leave applied if the code is rolled back.
--
-- **THE CONTRACT PHASE IS A LATER, SEPARATE MIGRATION** and there is nothing to contract
-- yet: no column is being replaced. When `founder_alerts` email-only mirroring is finally
-- retired in favour of `operator_tasks`, that is the contract step, and it is not this one.
--
-- **ABSENT-COLUMN / ABSENT-TABLE TOLERANCE IS IN THE CODE, LOUDLY.** `operator-tasks.ts`
-- and `automatic-work.ts` both detect "this table is not here yet" and say so — they do not
-- read a `supabase-js` `{data:null,error}` as an empty list. That distinction is the single
-- most expensive defect class in this repo (553 unchecked destructures), and a new table is
-- exactly where it bites: the code ships before the migration is run, every time.
--
-- ── WHAT EARNED EACH TABLE ──────────────────────────────────────────────────────────────
--
-- ① `operator_tasks` (XC-5). Every operator-facing exception in this product is currently
--    either an EMAIL (`sendFounderAlert`) or a value DERIVED on read (`deriveLifecycle`'s
--    `needsYou`). Neither is a record. An email is not a queue: it cannot be assigned,
--    resolved, deduped, counted or audited, and when it is missed there is nothing left
--    behind. A derived flag is not a record either: it exists only while the facts that
--    imply it still hold, so an exception that resolves itself leaves no trace that it ever
--    happened — and one that needs a human is invisible the moment the derivation changes.
--    Vida's Needs-you must be readable from the database, not recomputed from a guess.
--
-- ② `automatic_work` (XC-6). Nothing in this product owns TIME. Work that the system
--    promises to do by itself — start a Proof, promote a Brief, prepare a programme — has
--    no persisted "I said I would do this, at this moment, within this bound". So
--    "requested but never started" is indistinguishable from "never requested", which is
--    exactly how Northvale sat in unresolved `icp_review` with Milla saying it was
--    "finding your first examples" and Vida saying no action was needed. FD-0 requires BOTH
--    automatic recovery and an audited operator action, and both require a persisted state
--    to recover FROM.
--
-- ③ `app_migrations_applied` (XC-3). It already exists — created as a SIDE EFFECT of
--    `20260724_one_wallet.sql`'s exception handler, with two columns and no RLS. The
--    migration runner does not write to it: it replays all of its keys on every run and
--    keeps no applied-state record at all, so Vida → System cannot answer "has this been
--    applied?" except by looking for the object the migration was supposed to create. This
--    gives it the columns a ledger needs and enables RLS.
--
-- ⚠️ IDEMPOTENT THROUGHOUT. `IF NOT EXISTS` on every object, `DROP POLICY IF EXISTS` before
-- each `CREATE POLICY` (PostgreSQL has no `CREATE POLICY IF NOT EXISTS` — a fact this repo
-- learned the hard way: `20260525_milla_vida_tables.sql` has been unable to execute since
-- the day it was written because it uses exactly that non-existent syntax). Nothing here
-- tracks what has been applied, so every file must survive a re-run.
-- ═════════════════════════════════════════════════════════════════════════════════════════


-- ── ① OPERATOR TASKS — the persisted Needs-you row ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operator_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The machine class. Routing, dedupe and counting all key on this, never on the prose.
  kind          text NOT NULL,

  severity      text NOT NULL DEFAULT 'warn'
                  CHECK (severity IN ('info', 'warn', 'critical')),

  -- What the operator reads. One sentence, in the operator's language.
  title         text NOT NULL,
  detail        text,

  -- Who it is about. `client_id` cascades: a deleted client's tasks are about nobody.
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  -- ⚠️ `programme_id` IS DELIBERATELY NOT A FOREIGN KEY, matching the existing convention
  -- for operator-attribution columns on `operator_audit_log`: the record of what an operator
  -- was asked to do must outlive the thing it was about, and a cascade here would delete the
  -- evidence along with the subject.
  programme_id  uuid,
  subject_kind  text,
  subject_id    text,

  -- ⚠️ DEDUPE IS AN INDEX, NOT AN APPLICATION READ. A check-then-insert is a race, and the
  -- callers are crons: two slots firing on the same second is the normal case, not the edge
  -- case. `operator_tasks_one_open_per_key` below IS the authority.
  dedupe_key    text,

  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'resolved', 'dismissed')),

  -- Machine-readable evidence: the provider status code, the run id, the counts. Whatever
  -- the operator needs in order to decide without opening a terminal.
  evidence      jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  resolved_by   uuid,
  resolution_note text
);

COMMENT ON TABLE public.operator_tasks IS
  'XC-5. The PERSISTED operator exception. Every sendFounderAlert class writes one; the email is a mirror, not the record. Vida Needs-you reads this table. A task is resolved by a human with a note, or by the condition clearing, and either way the row survives as evidence that it happened.';

COMMENT ON COLUMN public.operator_tasks.dedupe_key IS
  'One OPEN task per (kind, dedupe_key), enforced by a partial unique index. Null means "never dedupe this one" — used where each occurrence is its own event.';

COMMENT ON COLUMN public.operator_tasks.evidence IS
  'Machine-readable facts the operator needs to decide: provider status code, run id, counts. NEVER a secret, a key, a database URL or a prospect''s personal data — this table is read by a console and copied into notes.';

-- 🛑 THE DEDUPE AUTHORITY. Without it, an Apollo 402 on a 2-hourly cron produces twelve
-- identical rows a day and the operator learns to ignore the list — which is the failure
-- mode the whole Needs-you design exists to prevent ("NORMAL IS SILENT").
CREATE UNIQUE INDEX IF NOT EXISTS operator_tasks_one_open_per_key
  ON public.operator_tasks (kind, dedupe_key)
  WHERE status = 'open' AND dedupe_key IS NOT NULL;

-- The two reads Vida actually performs: the open queue, and one client's history.
CREATE INDEX IF NOT EXISTS operator_tasks_open_created
  ON public.operator_tasks (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS operator_tasks_client
  ON public.operator_tasks (client_id, created_at DESC);

ALTER TABLE public.operator_tasks ENABLE ROW LEVEL SECURITY;

-- Operator-only, and that means service_role only: this is K.I.N.D's own queue and it
-- names clients other than the reader. No `authenticated` policy exists on purpose — a
-- client must never see another client's exception, and the safest way to guarantee that
-- is for the client role to have no path to the table at all.
DROP POLICY IF EXISTS operator_tasks_service_only ON public.operator_tasks;
CREATE POLICY operator_tasks_service_only ON public.operator_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── ② AUTOMATIC WORK — the system's own promise, written down ────────────────────────────

CREATE TABLE IF NOT EXISTS public.automatic_work (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHAT was promised: 'proof_run', 'brief_promotion', 'programme_prepare', …
  kind          text NOT NULL,

  -- WHICH thing it was promised about. Text, not uuid: the subject is sometimes an icp id,
  -- sometimes a programme id, sometimes a composite — and a typed column would force a
  -- second table per kind for no gain.
  subject_kind  text NOT NULL,
  subject_id    text NOT NULL,

  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  -- ⚠️ FIVE STATES, AND `stuck` IS NOT A SYNONYM FOR `failed`. A failure is a thing that
  -- happened and reported itself. STUCK is the absence of a report: it started and never
  -- came back, or it was requested and never started. Those need different recoveries —
  -- FD-0's automatic recovery can safely retry a failure, and must not silently retry
  -- something that may still be running.
  state         text NOT NULL DEFAULT 'requested'
                  CHECK (state IN ('requested', 'started', 'completed', 'failed', 'stuck')),

  -- How long this kind of work is allowed to take before silence becomes a finding. Stored
  -- per row, not read from a constant, so a bound that was in force when the work was
  -- requested cannot be retroactively changed by a deploy.
  bound_seconds int NOT NULL CHECK (bound_seconds > 0),

  requested_at  timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  failed_at     timestamptz,
  stuck_at      timestamptz,

  attempt       int NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  failure_reason text,

  -- The task the detector raised for this unit, so a second detector pass finds the row
  -- already reported instead of raising again.
  detected_task_id uuid REFERENCES public.operator_tasks(id) ON DELETE SET NULL,

  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.automatic_work IS
  'XC-6 / FD-0. One row per unit of work the SYSTEM promised to do by itself, with the moment it was promised and the bound it must finish inside. Nothing in this product owned time before this table: "requested but never started" was indistinguishable from "never requested", which is how a client sat on "finding your first examples" while nothing was running and Vida reported no action needed.';

COMMENT ON COLUMN public.automatic_work.bound_seconds IS
  'The bound in force WHEN THE WORK WAS REQUESTED. Stored per row rather than read from a constant so a later deploy cannot retroactively make a late run look punctual.';

-- 🛑 ONE LIVE UNIT PER SUBJECT — the retry-safety property, enforced by the database.
--
-- FD-0 is explicit that recovery must not "create concurrent runs" or "create a second
-- Proof entitlement". An application-level check-then-insert cannot promise that: the
-- callers are a cron, an HTTP retry and an operator button, and any two of them can arrive
-- together. This index refuses the second live row outright.
CREATE UNIQUE INDEX IF NOT EXISTS automatic_work_one_live_per_subject
  ON public.automatic_work (kind, subject_kind, subject_id)
  WHERE state IN ('requested', 'started');

-- The detector's own read: everything still live, oldest first.
CREATE INDEX IF NOT EXISTS automatic_work_live
  ON public.automatic_work (requested_at) WHERE state IN ('requested', 'started');
CREATE INDEX IF NOT EXISTS automatic_work_client
  ON public.automatic_work (client_id, requested_at DESC);

ALTER TABLE public.automatic_work ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automatic_work_service_only ON public.automatic_work;
CREATE POLICY automatic_work_service_only ON public.automatic_work
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── ③ THE APPLIED-MIGRATION LEDGER (XC-3) ───────────────────────────────────────────────
--
-- The table already exists in production with two columns, created accidentally by
-- `20260724_one_wallet.sql`'s `EXCEPTION WHEN undefined_table` handler. `CREATE TABLE IF
-- NOT EXISTS` therefore does nothing there and creates it on a fresh database; the `ADD
-- COLUMN IF NOT EXISTS` statements below are what actually change production.
CREATE TABLE IF NOT EXISTS public.app_migrations_applied (
  key         text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- EXPAND: four nullable columns. Nothing reads them until the runner writes them, and the
-- runner tolerates their absence (see `pending-migrations.ts`) — so this migration and the
-- code that uses it can land in either order without a window where either is broken.
ALTER TABLE public.app_migrations_applied
  ADD COLUMN IF NOT EXISTS last_outcome  text,
  ADD COLUMN IF NOT EXISTS last_error    text,
  ADD COLUMN IF NOT EXISTS last_run_at   timestamptz,
  ADD COLUMN IF NOT EXISTS run_count     int NOT NULL DEFAULT 0;

-- 🛑 AND `applied_at` MUST BECOME NULLABLE, OR NO FAILURE CAN EVER BE RECORDED.
--
-- This was found by running the real migration against a real PostgreSQL (§8.2-H), not by
-- reading: the original column is `NOT NULL DEFAULT now()`, because under the old ledger a
-- row's mere EXISTENCE meant "applied". A failed run must be recorded WITHOUT claiming an
-- application, so the insert proposes `applied_at = NULL` — and PostgreSQL checks NOT NULL on
-- the proposed tuple BEFORE the ON CONFLICT clause resolves it, so every failure record threw
-- 23502. The runner swallows ledger errors by design (a ledger problem must never fail a
-- migration that applied), which means the failure would have been **silently unrecordable**:
-- successes logged, failures dropped, and the one thing the ledger was added for missing.
--
-- ⚠️ THIS IS A WIDENING, NOT A CONTRACT. Dropping NOT NULL forbids nothing that was allowed
-- before and invalidates no existing row — every row written to date has a value, and the
-- DEFAULT is untouched, so `20260724_one_wallet.sql`'s accidental insert still fills it. Code
-- that runs before this statement keeps working; code that runs after tolerates NULL (and
-- `migration-ledger.ts` names this migration if it meets the constraint still in place).
ALTER TABLE public.app_migrations_applied
  ALTER COLUMN applied_at DROP NOT NULL;

COMMENT ON TABLE public.app_migrations_applied IS
  'XC-3. What the migration runner has actually applied. Before this, the runner replayed every key on every run and recorded nothing, so "has this been applied?" could only be answered by hunting for the object the migration was supposed to create — and a migration whose object already existed for another reason was indistinguishable from one that had run.';

COMMENT ON COLUMN public.app_migrations_applied.last_outcome IS
  'ok | error, from the most recent run of this key. `applied_at` is the FIRST success and never moves; this and last_run_at describe the latest attempt.';

ALTER TABLE IF EXISTS public.app_migrations_applied ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_migrations_applied_service_only ON public.app_migrations_applied;
CREATE POLICY app_migrations_applied_service_only ON public.app_migrations_applied
  FOR ALL TO service_role USING (true) WITH CHECK (true);
