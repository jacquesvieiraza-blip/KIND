-- ═════════════════════════════════════════════════════════════════════════════════════════
-- HOUSE-009 · PROGRAMME AUTHORITY IS NOT PDL MONEY — splitting the two things one function did
--
-- 🛑 WHAT WENT WRONG, LIVE (7 Sep). The first real House run sourced 246 people successfully,
-- and the Programme screen then said:
--
--     0 used · 0 reserved · 2500 left · "No batch has been opened yet"
--
-- Every one of those numbers is false, and none of them is a display bug.
--
-- ⚠️ THE CAUSE IS A CONFLATION, NOT A MISSING CALL. `try_spend_sourcing` does TWO unrelated
-- jobs in one body:
--
--   ① PROGRAMME AUTHORITY — reserve against `sourcing_ceiling`, enforce the 250 batch cap,
--     refuse a paused or unauthorised programme. This is ENTITLEMENT. It is true of every
--     programme regardless of who sourced the records.
--   ② PDL MONEY — `INSERT INTO sourcing_ledger (... v_granted * 0.28)`. This is COST, and it
--     is specifically PDL's cost per record.
--
-- House sources from APOLLO, which is prepaid — no PDL record is bought, so recording $0.28 a
-- head against it would be a fabricated cost. The 22 Aug fix therefore exempted House from the
-- whole RPC (`grantedSize = pdlRemainder`), which avoided the fake money and threw away the
-- entitlement accounting with it: no reservation, no ceiling enforcement, and — because
-- `openBatch` sits inside the same `else` branch — no batch. `settleBatch` then runs only
-- `if (programmeBatch)`, so nothing converted reserved → used either.
--
-- ⚠️ SO THE 2,500 CEILING WAS NOT BEING ENFORCED ON THE HOUSE PATH AT ALL. That is the part
-- that matters more than the screen: an unbounded House run had nothing to stop it.
--
-- ── THE FIX: ONE RESERVE, TWO CALLERS ───────────────────────────────────────────────────
-- `try_reserve_programme_sourcing` is the programme-authority half, extracted whole. It knows
-- nothing about providers, rates or ledgers — it answers ONE question: *how many records may
-- this programme reserve right now?*
--
--   · `try_spend_sourcing` (PDL, paid clients) calls it, then writes its ledger row. Its
--     signature, its arguments, its legacy branch and its return value are UNCHANGED, so
--     every existing caller and every existing guard behaves exactly as it does today.
--   · The House path calls it DIRECTLY and writes no ledger row, because there is no PDL
--     record to record. It gets the reservation, the ceiling and the batch; it gets no
--     invented cost.
--
-- ⚠️ THERE IS EXACTLY ONE IMPLEMENTATION OF THE CEILING. Two callers enforcing "2,500" in two
-- places is how they drift, and a drifted ceiling is a programme silently over-sourcing.
--
-- ⚠️ AND `try_spend_sourcing` KEEPS ITS SIGNATURE — deliberately. The 28 Aug header documents
-- why a new defaulted parameter is dangerous here: `CREATE OR REPLACE` with an added default
-- creates a SECOND overload, and an ambiguous call on the sourcing gate is a hard error on the
-- live money path for every client. Adding a provider argument would have re-run that risk for
-- no benefit, since House needs LESS of this function, not more of it.
-- ═════════════════════════════════════════════════════════════════════════════════════════


-- ── 1 · the programme-authority reserve, alone ───────────────────────────────────────────
--
-- Returns the number of records this programme may reserve, having already reserved them.
-- Returns 0 — never an error — for every refusal, matching `try_spend_sourcing`'s contract so
-- a caller cannot tell the two apart and start special-casing.

CREATE OR REPLACE FUNCTION public.try_reserve_programme_sourcing(
  p_programme_id uuid,
  p_requested    int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- ⚠️ CONTROLLED EXECUTION, AND IT IS A DIFFERENT LIMIT FROM THE CEILING (founder lock 4).
  -- The ceiling is the TOTAL a programme may ever source; this is the MOST any single grant
  -- may take. Same value, same reason, same place it was before — moved, not re-decided.
  v_batch_cap   int := 250;
  v_status      text;
  v_paused      timestamptz;
  v_room        int;
  v_granted     int;
BEGIN
  IF p_programme_id IS NULL OR p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  SELECT status, paused_at INTO v_status, v_paused
    FROM public.programmes WHERE id = p_programme_id;
  IF v_status IS NULL THEN
    RETURN 0;
  END IF;

  -- Sourcing is authorised by the first payment, so the programme must have reached at least
  -- SOURCING_AUTHORISED and must not be paused. Money is already collected; the constraint
  -- here is entitlement, not wallet balance.
  IF v_status NOT IN ('SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE') THEN
    RETURN 0;
  END IF;
  IF v_paused IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- RESERVE, do not consume: `sourced_reserved` rises now and is converted to `sourced_used`
  -- only when a provider actually delivers. The guarded UPDATE makes two concurrent batches
  -- unable to exceed the ceiling — the loser's UPDATE matches no row.
  SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
    FROM public.programmes WHERE id = p_programme_id;

  v_granted := LEAST(p_requested, COALESCE(v_room, 0), v_batch_cap);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.programmes
    SET sourced_reserved = sourced_reserved + v_granted, updated_at = now()
    WHERE id = p_programme_id
      AND sourced_used + sourced_reserved + v_granted <= sourcing_ceiling;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN v_granted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_reserve_programme_sourcing(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_reserve_programme_sourcing(uuid, int) TO service_role;

COMMENT ON FUNCTION public.try_reserve_programme_sourcing(uuid, int) IS
  'HOUSE-009. Programme sourcing AUTHORITY only: status, pause, ceiling and the 250 batch cap. Writes no ledger row and touches no wallet, because entitlement and provider cost are different facts. try_spend_sourcing calls this and then records PDL money; the Apollo/House path calls it and records none. One implementation of the ceiling, two callers.';


-- ── 2 · try_spend_sourcing delegates its programme branch ────────────────────────────────
--
-- ⚠️ SAME SIGNATURE, SAME RETURN, SAME LEGACY BRANCH. This is a REPLACE of one function body,
-- not a new overload: nothing about how any existing caller resolves or behaves changes. The
-- programme branch's reserve is now performed by the extracted function above and its ledger
-- row still written here, at the same rate, with the same pessimistic-at-grant timing.

CREATE OR REPLACE FUNCTION public.try_spend_sourcing(
  p_client_id uuid,
  p_requested int,
  p_programme_id uuid DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate         numeric := 0.28;
  v_daily_cap    int     := 100;
  v_cap_usd      numeric;
  v_month_usd    numeric;
  v_month_room   int;
  v_day_used     int;
  v_day_room     int;
  v_allowance    int;
  v_granted      int;
  v_open_id      uuid;
  v_open_status  text;
BEGIN
  IF p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  -- WHICH REGIME APPLIES IS DECIDED HERE, FROM THE DATABASE — never from what the caller
  -- sent. This is the whole point of putting the gate inside the function.
  SELECT id, status INTO v_open_id, v_open_status
    FROM public.programmes
    WHERE client_id = p_client_id AND status NOT IN ('COMPLETED', 'CANCELLED')
    LIMIT 1;

  -- FAIL CLOSED ①: a legacy client can never borrow programme authority.
  IF v_open_id IS NULL AND p_programme_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- FAIL CLOSED ②: a programme client must declare its programme. Omission is not a
  -- fallback to the legacy wallet — it is a caller that forgot, and it returns 0.
  IF v_open_id IS NOT NULL AND p_programme_id IS NULL THEN
    RETURN 0;
  END IF;

  -- FAIL CLOSED ③: a mismatched id is never treated as "close enough".
  IF v_open_id IS NOT NULL AND p_programme_id <> v_open_id THEN
    RETURN 0;
  END IF;

  IF v_open_id IS NOT NULL THEN
    -- ── PROGRAMME AUTHORITY ───────────────────────────────────────────────────────────
    -- Status, pause, ceiling and batch cap now live in ONE place (see § 1). A zero here is
    -- every refusal that branch used to make, with the same meaning.
    v_granted := public.try_reserve_programme_sourcing(v_open_id, p_requested);
    IF v_granted <= 0 THEN
      RETURN 0;
    END IF;

    -- Provider spend is still recorded pessimistically at grant time — the existing
    -- spend-safety model, unchanged. Attribution lets contribution use ACTUAL cost.
    INSERT INTO public.sourcing_ledger (client_id, records, cost_usd, programme_id)
      VALUES (p_client_id, v_granted, v_granted * v_rate, v_open_id);

    RETURN v_granted;
  END IF;

  -- ── LEGACY BEHAVIOUR — unchanged from 20260711_sourcing_fences.sql ──────────────────
  SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;
  v_cap_usd := COALESCE(v_cap_usd, 300);
  SELECT COALESCE(SUM(cost_usd), 0) INTO v_month_usd
    FROM public.sourcing_ledger
    WHERE created_at >= date_trunc('month', now());
  v_month_room := GREATEST(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;

  SELECT COALESCE(SUM(records), 0) INTO v_day_used
    FROM public.sourcing_ledger
    WHERE client_id = p_client_id
      AND created_at >= date_trunc('day', now());
  v_day_room := GREATEST(0, v_daily_cap - v_day_used);

  SELECT COALESCE(sourcing_allowance, 0) INTO v_allowance
    FROM public.clients WHERE id = p_client_id;

  v_granted := LEAST(p_requested, COALESCE(v_allowance, 0), v_month_room, v_day_room);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.clients
    SET sourcing_allowance = sourcing_allowance - v_granted
    WHERE id = p_client_id
      AND COALESCE(sourcing_allowance, 0) >= v_granted;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.sourcing_ledger (client_id, records, cost_usd)
    VALUES (p_client_id, v_granted, v_granted * v_rate);

  RETURN v_granted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) TO service_role;


-- ── 3 · reconcile the records ALREADY delivered outside the accounting ───────────────────
--
-- 246 real people are attributed to the House programme and belong to no batch, because they
-- were sourced while the House path bypassed all of this. The code fix above makes every
-- FUTURE run count; it cannot retro-count a run that already happened.
--
-- ⚠️ THIS IS OPERATOR-INVOKED, NOT AUTOMATIC, AND THAT IS THE POINT. A migration that silently
-- rewrote `sourced_used` for every programme it found would be writing money-adjacent counters
-- for clients on the strength of an inference. This function does one named programme, when
-- somebody asks it to, and says how many records it accounted for.
--
-- ⚠️ IT ADDS; IT DELETES NOTHING. A batch row is created and the orphaned leads are stamped
-- with it. Every lead, every timestamp and every existing row survives untouched — "historical
-- House evidence must be PRESERVED, not deleted."
--
-- ⚠️ IT IS IDEMPOTENT BY CONSTRUCTION. After it runs, those leads carry a `batch_id`, so a
-- second call finds nothing orphaned and returns 0. There is no flag to remember to set.
--
-- ⚠️ AND IT REFUSES RATHER THAN HALF-COUNTS. If the orphans would not fit under the ceiling,
-- it raises instead of stamping 246 leads while counting 200 of them — a partial reconcile is
-- a new inconsistency wearing the clothes of a fix.

CREATE OR REPLACE FUNCTION public.reconcile_programme_sourcing(
  p_programme_id uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orphans   int;
  v_foreign   int;
  v_client    uuid;
  v_room      int;
  v_seq       int;
  v_batch     uuid;
BEGIN
  SELECT client_id INTO v_client
    FROM public.programmes WHERE id = p_programme_id FOR UPDATE;
  IF v_client IS NULL THEN
    RETURN 0;
  END IF;

  -- 🛑 FAIL CLOSED ON AMBIGUOUS ATTRIBUTION, BEFORE COUNTING ANYTHING.
  --
  -- A lead carrying THIS programme's id while belonging to ANOTHER client is a corrupt link,
  -- and it is the exact shape a cross-tenant leak would take on a shared database — M&V's own
  -- desk and a customer's desk both live in these tables. Counting such a row would put
  -- somebody else's prospect inside this programme's consumed volume, and stamping it would
  -- attach that prospect to this programme's batch permanently.
  --
  -- ⚠️ IT REFUSES THE WHOLE CALL RATHER THAN FILTERING THE ROW OUT. Quietly skipping it would
  -- reconcile "successfully" while leaving a corruption nobody is told about — and this
  -- function exists precisely because unnoticed miscounts are expensive.
  SELECT COUNT(*) INTO v_foreign
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id IS DISTINCT FROM v_client;
  IF v_foreign > 0 THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % lead(s) attributed to it that belong to another client. Attribution is ambiguous, so nothing was counted, stamped or changed. Resolve the attribution first.',
      p_programme_id, v_foreign;
  END IF;

  -- DELIVERED, unbatched, and this client's: a person we actually obtained, whose sourcing was
  -- never counted. An undelivered lead consumed no authority and must not manufacture one, and
  -- the `client_id` predicate is a second, positive tenancy fence rather than a reliance on the
  -- check above having been reached.
  SELECT COUNT(*) INTO v_orphans
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND delivered_at IS NOT NULL;

  IF v_orphans <= 0 THEN
    RETURN 0;
  END IF;

  SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
    FROM public.programmes WHERE id = p_programme_id;

  IF COALESCE(v_room, 0) < v_orphans THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % unaccounted delivered lead(s) but only % of its ceiling left. Nothing was changed — this needs a decision, not a partial count.',
      p_programme_id, v_orphans, COALESCE(v_room, 0);
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_seq
    FROM public.programme_batches WHERE programme_id = p_programme_id;

  -- Settled on creation: this batch is a RECORD of delivery that already happened, so it never
  -- occupies the one-running slot and cannot be settled a second time.
  INSERT INTO public.programme_batches
    (programme_id, seq, requested, granted, delivered, status, settled_at)
  VALUES
    (p_programme_id, v_seq, v_orphans, v_orphans, v_orphans, 'served', now())
  RETURNING id INTO v_batch;

  UPDATE public.leads SET batch_id = v_batch
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND delivered_at IS NOT NULL;

  UPDATE public.programmes
    SET sourced_used = sourced_used + v_orphans,
        status       = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END,
        updated_at   = now()
    WHERE id = p_programme_id
      AND sourced_used + sourced_reserved + v_orphans <= sourcing_ceiling;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconcile_programme_sourcing: the ceiling guard refused programme % after the room check passed. Nothing was committed.', p_programme_id;
  END IF;

  RETURN v_orphans;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) TO service_role;

COMMENT ON FUNCTION public.reconcile_programme_sourcing(uuid) IS
  'HOUSE-009 repair. Accounts for leads already DELIVERED under a programme that carry no batch, by creating one settled batch, stamping those leads with it and converting the volume to sourced_used. Operator-invoked for one named programme; idempotent; adds rows and deletes none; refuses outright rather than counting a subset.';
