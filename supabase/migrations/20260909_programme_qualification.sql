-- ═════════════════════════════════════════════════════════════════════════════════════════
-- PROGRAMME ENTITLEMENT IS CONSUMED BY QUALIFICATION, NOT BY DELIVERY (founder-locked 9 Sep)
--
-- 🛑 WHAT THIS CORRECTS, AND IT IS AN ACCOUNTING DEFECT RATHER THAN A BUG IN ONE FUNCTION.
--
-- `sourced_used` was settled on `delivered_at`. That column is the legacy SELF-SERVE
-- visibility stamp: it is written by three unrelated acts, and on the programme path it is
-- gated by `deliveryCapBalance()` — which returns a CONSTANT 25 regardless of plan or balance
-- — and then by a nightly drip of ~5/day. So a 250-candidate batch would settle at at most 25
-- "used" and release the other 225 back to the ceiling, and the historical House run reported
-- `0 used · 0 reserved · 2500 left` about 246 real people.
--
-- ⛓️ THE FIRST FIX (#1651) MOVED THE COUNT AND KEPT THE PREDICATE. It settled on
-- `count(batch_id = X AND delivered_at IS NOT NULL)` — the same 25-capped population. Correct
-- shape, wrong event.
--
-- ── THE LOCKED MODEL ────────────────────────────────────────────────────────────────────
--
--   reserve → source → enrich → FINAL M&V QUALIFICATION → qualified consume USED
--   → failures release the reservation → customer visibility changes no counter
--
-- A customer's entitlement buys QUALIFIED PROSPECTS. A candidate M&V itself rejects has cost
-- them nothing and must not consume their ceiling; a prospect they can see is a fact about a
-- screen, not about a ledger.
--
-- ── ① THE VERDICT, PERSISTED ON THE LEAD ────────────────────────────────────────────────
--
-- `finalVerdict` (lib/icp-qualification.ts) already decides this. What has never existed is a
-- place to WRITE the answer, so a rejected candidate left no trace: it was re-picked by the
-- drip, RE-REVEALED at cost, and delivered on a path that runs no ICP gate at all.
--
--   qualified_at       proved to match the customer's ICP; consumes entitlement
--   disqualified_at    proved not to; consumes nothing, is never surfaced, never re-revealed
--   disqualify_reason  the truthful reason, from `QualificationRefusal`
--
-- Exactly one of the two timestamps is ever set. NULL/NULL means CANDIDATE — not yet judged.
--
-- ── ② `leads.email_status` — THE COLUMN THIS DESIGN CANNOT WORK WITHOUT ─────────────────
--
-- 🛑 IT IS NOT A FIFTH NICE-TO-HAVE. `finalVerdict` needs three facts: email, EMAIL STATUS and
-- country. `leads` stores email and country and has never stored the status. The only proxy is
-- `apollo_consented`, and it is NOT the same fact: it is written
-- `email_status === 'verified' || email_status === 'likely_to_engage'` (routes/icps.ts), and
-- the drip path writes it TRUE unconditionally for anything the provider returned. House
-- requires a VERIFIED business address, so `apollo_consented = true` cannot prove the ICP.
--
-- ⚠️ WITHOUT THIS COLUMN "judge from stored facts" IS UNREACHABLE FOR HOUSE — every candidate
-- would need a provider reveal on every pass, for ever, because the fact that came back would
-- have nowhere to live. One nullable text column is the difference between a reveal that is
-- paid for once and a reveal that is paid for repeatedly.
--
-- ── ③ `programme_batches.inserted` ──────────────────────────────────────────────────────
--
-- The batch already records `requested` and `granted` (authority) and `delivered` (which now
-- means USED — the rename is post-launch, see the comment on the column). What it could not
-- say is how many CANDIDATES the attempt actually obtained, which is the number that makes
-- "250 requested, 246 obtained, 210 qualified" explainable instead of a gap.
--
-- ── ④ THE RECONCILIATION RPC, REPOINTED ────────────────────────────────────────────────
--
-- Same name, same signature, same return type — replaced in place, so nothing that calls it
-- changes. What changes is what it counts, and one new refusal:
--
--   🛑 IT REFUSES WHILE ANY CANDIDATE IS UNJUDGED. This is the server-side safety net for the
--   Vida control that still says "Account for delivered sourcing": after this migration that
--   button cannot settle anything, because the 246 have no verdicts. It stops being able to
--   write a wrong number the moment this runs, and before any application code ships.
--
-- ⚠️ NOTHING HERE CALLS A PROVIDER, sources anybody, or touches a wallet. It counts rows that
-- already exist and writes one batch row.
--
-- ⚠️ NULLABLE, NO DEFAULT, NO BACKFILL, NO ROW MUTATED BY THIS FILE. Every existing lead is
-- NULL/NULL — an honest "not yet judged" — and every existing batch has `inserted` NULL,
-- because we do not know what a historical batch obtained and guessing would invent a number.
-- ═════════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS qualified_at      timestamptz,
  ADD COLUMN IF NOT EXISTS disqualified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS disqualify_reason text,
  ADD COLUMN IF NOT EXISTS email_status      text;

COMMENT ON COLUMN public.leads.qualified_at IS
  'When M&V proved this candidate matches the customer''s full ICP (lib/icp-qualification.ts finalVerdict) on facts we actually hold. A qualified prospect is what consumes programme entitlement - sourced_used counts these, never delivered_at. NULL with disqualified_at also NULL means CANDIDATE: sourced but not yet judged.';

COMMENT ON COLUMN public.leads.disqualified_at IS
  'When M&V proved this candidate does NOT match the ICP. A disqualified candidate consumes no entitlement, is never surfaced for review, is never enrolled, and is never revealed again - the absence of this marker is why a rejected candidate used to be re-picked by the drip and re-revealed at cost.';

COMMENT ON COLUMN public.leads.disqualify_reason IS
  'The QualificationRefusal that decided it: no_email | personal_email | unverified_email | geography_unknown | geography_mismatch. Persisted so a batch of 250 can explain its own shortfall instead of presenting one.';

COMMENT ON COLUMN public.leads.email_status IS
  'The provider''s verification status for the address, as returned by the PAID reveal (Apollo bulk_match). NOT apollo_consented, which is true for BOTH "verified" and "likely_to_engage" and is written unconditionally by the drip path - it cannot prove a verified address. Stored so a candidate already revealed is judged from stored facts rather than revealed a second time.';

ALTER TABLE public.programme_batches
  ADD COLUMN IF NOT EXISTS inserted int;

COMMENT ON COLUMN public.programme_batches.inserted IS
  'Candidates this attempt actually obtained and attributed. requested = what authority was asked for, granted = what was reserved, inserted = what the provider produced, delivered = what QUALIFIED and therefore consumed entitlement. The delivered column keeps its name until a post-launch rename; its meaning is USED.';

-- Partial indexes on the two queries this design adds: "candidates still needing a verdict"
-- and "the qualified rows of this batch". Both are programme-scoped and highly selective.
CREATE INDEX IF NOT EXISTS leads_unjudged_candidates_idx
  ON public.leads (programme_id)
  WHERE programme_id IS NOT NULL AND qualified_at IS NULL AND disqualified_at IS NULL;

CREATE INDEX IF NOT EXISTS leads_qualified_idx
  ON public.leads (programme_id, batch_id)
  WHERE qualified_at IS NOT NULL;


-- ── THE RECONCILIATION, COUNTING THE RIGHT EVENT ─────────────────────────────────────────
--
-- Historical recovery for an attempt that ran before the accounting existed: it creates the
-- one settled batch that attempt never had, stamps EVERY candidate of that attempt with it —
-- qualified and disqualified alike, because both belong to the 250 that was attempted — and
-- converts the QUALIFIED count to `sourced_used`.
--
-- ⚠️ REJECTED CANDIDATES ARE STAMPED AND NOT COUNTED. Leaving them batch-less would make them
-- look like a second unaccounted attempt for ever; counting them would charge the customer for
-- M&V's own rejects. They are in the batch, and they are not in `used`.

CREATE OR REPLACE FUNCTION public.reconcile_programme_sourcing(
  p_programme_id uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client     uuid;
  v_foreign    int;
  v_candidates int;
  v_unjudged   int;
  v_qualified  int;
  v_requested  int;
  v_room       int;
  v_seq        int;
  v_batch      uuid;
BEGIN
  SELECT client_id INTO v_client
    FROM public.programmes WHERE id = p_programme_id FOR UPDATE;
  IF v_client IS NULL THEN
    RETURN 0;
  END IF;

  -- 🛑 FAIL CLOSED ON AMBIGUOUS ATTRIBUTION, BEFORE COUNTING ANYTHING. A lead carrying THIS
  -- programme's id while belonging to ANOTHER client is a corrupt link and the exact shape a
  -- cross-tenant leak would take. Counting it would put somebody else's prospect inside this
  -- programme's consumed volume; stamping it would attach them to this batch permanently. The
  -- whole call refuses rather than filtering the row out, because a quiet skip reconciles
  -- "successfully" while leaving a corruption nobody is told about.
  SELECT COUNT(*) INTO v_foreign
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id IS DISTINCT FROM v_client;
  IF v_foreign > 0 THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % lead(s) attributed to it that belong to another client. Attribution is ambiguous, so nothing was counted, stamped or changed. Resolve the attribution first.',
      p_programme_id, v_foreign;
  END IF;

  -- The unaccounted attempt: every programme-attributed row of this client that belongs to no
  -- batch. NOT filtered by delivered_at — that column is customer visibility and has no place
  -- in this ledger.
  SELECT COUNT(*) INTO v_candidates
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL;

  -- IDEMPOTENT BY CONSTRUCTION. After a successful run every one of those rows carries a
  -- batch_id, so a second call finds nothing and returns 0. There is no flag to remember.
  IF v_candidates <= 0 THEN
    RETURN 0;
  END IF;

  -- 🛑 THE REFUSAL THAT MAKES THE OLD VIDA BUTTON HARMLESS. An attempt cannot be settled while
  -- M&V has not judged it: settling would write a `sourced_used` derived from whichever
  -- candidates happened to have been judged so far, and the ceiling would then be wrong in a
  -- way nothing downstream could detect.
  SELECT COUNT(*) INTO v_unjudged
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND qualified_at IS NULL
      AND disqualified_at IS NULL;
  IF v_unjudged > 0 THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % candidate(s) with no qualification verdict. Entitlement is consumed by QUALIFIED prospects, so an unjudged attempt cannot be settled. Nothing was counted, stamped or changed - qualify the candidates first.',
      p_programme_id, v_unjudged;
  END IF;

  SELECT COUNT(*) INTO v_qualified
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND qualified_at IS NOT NULL;

  -- The ceiling is checked against what will actually be CONSUMED.
  SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
    FROM public.programmes WHERE id = p_programme_id;
  IF COALESCE(v_room, 0) < v_qualified THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % qualified prospect(s) to account for but only % of its ceiling left. Nothing was changed - this needs a decision, not a partial count.',
      p_programme_id, v_qualified, COALESCE(v_room, 0);
  END IF;

  -- A controlled batch is ~250 (founder lock 4), and that is what the historical attempt asked
  -- for. Expressed as a GREATEST so an attempt that somehow obtained more than a batch still
  -- produces a coherent row rather than requested < granted.
  v_requested := GREATEST(250, v_candidates);

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_seq
    FROM public.programme_batches WHERE programme_id = p_programme_id;

  -- Settled on creation: this is a RECORD of an attempt that already happened, so it never
  -- occupies the one-running slot and cannot be settled a second time.
  --
  -- ⚠️ `granted` = the candidates obtained, NOT 250. No reservation was ever held for this
  -- historical run (the House path bypassed the accounting entirely), so claiming 250 was
  -- granted would assert a reservation that never existed. `sourced_reserved` is likewise left
  -- alone: there is nothing to release.
  INSERT INTO public.programme_batches
    (programme_id, seq, requested, granted, inserted, delivered, status, settled_at)
  VALUES
    (p_programme_id, v_seq, v_requested, v_candidates, v_candidates, v_qualified, 'served', now())
  RETURNING id INTO v_batch;

  -- EVERY candidate of the attempt, qualified and disqualified alike.
  UPDATE public.leads SET batch_id = v_batch
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL;

  UPDATE public.programmes
    SET sourced_used = sourced_used + v_qualified,
        status       = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END,
        updated_at   = now()
    WHERE id = p_programme_id
      AND sourced_used + sourced_reserved + v_qualified <= sourcing_ceiling;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconcile_programme_sourcing: the ceiling guard refused programme % after the room check passed. Nothing was committed.', p_programme_id;
  END IF;

  RETURN v_qualified;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) TO service_role;

COMMENT ON FUNCTION public.reconcile_programme_sourcing(uuid) IS
  'HOUSE-009 repair, repointed 9 Sep. Settles an attempt that ran before the accounting existed: one settled batch, EVERY candidate stamped with it (qualified and disqualified), sourced_used += the QUALIFIED count. It counts qualification, never delivered_at, and REFUSES while any candidate is unjudged - which is what stops the older Vida control from settling a number nobody has proved. Operator-invoked, idempotent, adds rows and deletes none, calls no provider.';
