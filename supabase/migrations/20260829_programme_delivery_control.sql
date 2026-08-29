-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 PR 2 — PROGRAMME DELIVERY CONTROL: ATOMIC BATCH CLAIM + THE REVIEW HOLD
--
-- ⚠️ THIS RUNS ON THE NEXT DEPLOY. It is in PENDING_MIGRATIONS and the deploy applies the
-- whole pending set automatically. Everything below is additive and idempotent, and no
-- statement writes, deletes or rewrites a single existing row.
--
-- ═══ 1 · THE RACE THAT IS ACTUALLY THERE ═══
--
-- ⛓️ CORRECTING MY OWN SCOPE CARD: I wrote that `(programme_id, seq)` had no unique
-- constraint. It does — `programme_batches_seq_uidx`, created by 20260828_programme_money_
-- engine.sql:190. I had read packages/db/src/schema.sql, which does not declare it, and not
-- the migration. So the double-INSERT is already impossible.
--
-- The real hole is the one that index cannot close. `openBatch` reads MAX(seq), adds one and
-- inserts. Two workers racing produce ONE winner and one unique violation — and `openBatch`
-- returns null on error, so the loser reports "could not open a batch". A caller that retries
-- (a cron re-fire, an operator clicking twice, a webhook redelivery) then reads the NEW max,
-- computes seq+1, and inserts successfully. Result: TWO batches in status 'running' on one
-- programme, each holding its own reservation against the client's paid ceiling. Nothing in
-- the schema forbade that, and no unique key on (programme_id, seq) ever could — the second
-- batch has a legitimately different seq.
--
-- 🛑 SO THE CONSTRAINT THAT MATTERS IS "AT MOST ONE RUNNING BATCH PER PROGRAMME", and it is
-- enforced by the database rather than by a check-then-act in application code, because
-- check-then-act is the bug.
--
-- ⚠️ STATE NAMES ARE READ OFF THE SCHEMA, NOT INVENTED. programme_batches_status_check
-- (20260828:183-184) permits exactly: running · served · released · stranded. 'running' is
-- the only open/active state, so that is what the partial index keys on.
--
-- ═══ 2 · AND THE LOSER MUST REUSE, NOT FAIL ═══
--
-- The founder's requirement is explicit: two workers opening the same programme's next batch
-- must end with ONE active batch, and the second must receive the existing one or fail
-- idempotently — never create another. A bare unique index gives the second worker an
-- exception, which is safe but not idempotent. So the claim is an RPC that, under a row lock
-- on the programme, either returns the batch already running or creates exactly one.
--
-- ═══ 3 · THE REVIEW HOLD IS FOUR NULLABLE COLUMNS, NOT A STATE MACHINE ═══
--
-- Founder decision, 29 Aug: REVIEW ≠ PAUSE. Pause is the hard stop (no new sourcing, no new
-- outreach, no new sends). Review holds only the NEXT NEW BATCH — an in-flight sequence
-- finishes its story, replies and meetings keep ingesting, history stays history.
--
-- ⚠️ NOT A STATUS VALUE, for the same reason `paused_at` is not one: a programme under review
-- must keep the state it returns to, and folding review into `status` doubles every
-- transition rule. Four nullable columns, no second state machine.
--
--   review_required_at IS NOT NULL AND review_resolved_at IS NULL  ->  next batch is HELD
--   review_resolved_at IS NOT NULL                                 ->  a human decided
--   both NULL                                                      ->  nothing owed (normal)
--
-- ⚠️ NO COMMERCIAL MEANING IS ENCODED HERE. 250 leads per targeted meeting is a PLANNING
-- BENCHMARK (R77), not a guarantee. Reaching it with no meeting is when a person looks. This
-- migration stores no money, promises no refund, and creates no meeting. `public.meetings`
-- remains the sole meeting truth.
--
-- ⚠️ RUNTIME NOTE — THE ONE THING THAT COULD FAIL. The partial unique index below is created
-- against live data. If any programme ALREADY has two rows in status 'running', creation
-- fails and this migration rolls back (the runner sends each migration as one string, which
-- Postgres wraps in an implicit transaction). That is the correct outcome — it means the race
-- has already happened and needs a human, not a silently skipped index. Repo evidence says it
-- cannot have: `programmes` is inert until a programme row exists, and no real customer
-- payment has been taken. Confirm with:
--     select programme_id, count(*) from public.programme_batches
--     where status = 'running' group by 1 having count(*) > 1;
-- Expect zero rows.
-- ═══════════════════════════════════════════════════════════════════════════════════════


-- ── 1 · AT MOST ONE RUNNING BATCH PER PROGRAMME ────────────────────────────────────────
--
-- The whole concurrency fix in one line. Partial, so served/released/stranded history is
-- unlimited — only the OPEN batch is exclusive.

CREATE UNIQUE INDEX IF NOT EXISTS programme_batches_one_running_uidx
  ON public.programme_batches (programme_id)
  WHERE status = 'running';


-- ── 2 · THE REVIEW HOLD ────────────────────────────────────────────────────────────────
--
-- Additive and nullable: every existing row reads as "nothing owed" without being touched.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_required_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_reason      text,
  ADD COLUMN IF NOT EXISTS review_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_resolution  text;

COMMENT ON COLUMN public.programmes.review_required_at IS
  'BUILD-003 PR2. Set when the programme reached the R77 planning benchmark (250 delivered leads per targeted meeting) with no live booked meeting. Holds the NEXT NEW BATCH only — it is NOT a pause: in-flight sequence steps finish, replies and meetings keep ingesting. A planning benchmark is not a guarantee: this column promises no meeting, no refund and no credit.';
COMMENT ON COLUMN public.programmes.review_resolved_at IS
  'Set when a human resolved the review. Only an explicit operator decision clears the hold — nothing on a clock, and no background job.';

-- Finding an open review must not scan the table as programmes accumulate.
CREATE INDEX IF NOT EXISTS programmes_review_open_idx
  ON public.programmes (review_required_at)
  WHERE review_required_at IS NOT NULL AND review_resolved_at IS NULL;


-- ── 3 · THE ATOMIC BATCH CLAIM ─────────────────────────────────────────────────────────
--
-- Returns the batch already running for this programme, or creates exactly one. Never two.
--
-- ⚠️ `PERFORM ... FOR UPDATE` ON THE PROGRAMME ROW IS THE SERIALISER. Two callers arriving
-- together are ordered by that lock, so the second one's SELECT below runs AFTER the first
-- one's INSERT is visible to it — which is what makes "reuse the existing batch" true rather
-- than hopeful. Without the lock, both SELECTs could find nothing and both proceed to INSERT;
-- the partial unique index would then reject one, which is safe but not idempotent, and the
-- founder's requirement is that the second worker RECEIVES the batch.
--
-- ⚠️ SECURITY DEFINER IS DELIBERATELY **NOT** USED. The API connects on the service role,
-- which already bypasses RLS. Adding SECURITY DEFINER would grant this to any role that can
-- execute it, for no benefit.
--
-- Returns the batch row. Callers compare `seq`/`id` to know whether they created or joined.

CREATE OR REPLACE FUNCTION public.claim_programme_batch(
  p_programme_id uuid,
  p_requested    int,
  p_granted      int
) RETURNS public.programme_batches
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.programme_batches;
  v_next_seq int;
  v_row      public.programme_batches;
BEGIN
  -- Serialise every claimer for this programme behind one row lock.
  PERFORM 1 FROM public.programmes WHERE id = p_programme_id FOR UPDATE;

  SELECT * INTO v_existing
  FROM public.programme_batches
  WHERE programme_id = p_programme_id AND status = 'running'
  LIMIT 1;

  -- ALREADY RUNNING → hand back the same batch. This is the idempotent path: a retry, a
  -- redelivered webhook and a double-clicked operator button all land here.
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_next_seq
  FROM public.programme_batches
  WHERE programme_id = p_programme_id;

  INSERT INTO public.programme_batches (programme_id, seq, requested, granted, status)
  VALUES (p_programme_id, v_next_seq, p_requested, p_granted, 'running')
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_programme_batch(uuid, int, int) IS
  'BUILD-003 PR2. Atomically claim the programme''s open batch: returns the one already running, or creates exactly one. Serialised by FOR UPDATE on the programme row, and backstopped by programme_batches_one_running_uidx. Replaces a read-MAX-then-insert in openBatch whose loser could retry into a SECOND running batch, each holding its own reservation against the client''s paid ceiling.';


-- ── 4 · ATTRIBUTION AT ITS SOURCE: leads.programme_id / leads.batch_id ─────────────────
--
-- ⚠️ WITHOUT THIS THE ATTRIBUTION CHAIN HAS NO BEGINNING. PR 1 added programme_id and batch_id
-- to `figsy_enrollments` and nothing wrote them, because there was nowhere to read them FROM:
-- `leads` records who we bought and never which programme or batch bought them. Resolving an
-- enrollment's programme from "whatever the client's programme is today" would silently
-- re-attribute a lead sourced under batch 1 to batch 7, which is worse than null.
--
-- So the person carries their own provenance, stamped by the sourcing run that paid for them,
-- and the enrollment copies it from the lead.
--
-- ⚠️ NULLABLE AND NEVER BACKFILLED. Every lead sourced before today has no batch, and that is
-- the honest answer — inventing one would manufacture certainty we do not have. Legacy
-- non-programme leads stay null permanently, because they belong to no programme.
--
-- ON DELETE SET NULL, not CASCADE: deleting a programme must never delete the people.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id)       ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id     uuid REFERENCES public.programme_batches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.programme_id IS
  'BUILD-003 PR2. The programme whose authority paid to source this person. NULL for legacy/non-programme leads and for everyone sourced before attribution existed — never backfilled, because a guessed batch is worse than an honest null.';

CREATE INDEX IF NOT EXISTS leads_programme_idx ON public.leads (programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_batch_idx     ON public.leads (batch_id)     WHERE batch_id IS NOT NULL;
