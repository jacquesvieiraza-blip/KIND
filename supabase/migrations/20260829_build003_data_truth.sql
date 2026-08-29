-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 PR 1 — DATA TRUTH + SAFETY
--
-- Three things, in one migration because they share a boundary:
--   A. TENANT ISOLATION on the nine delivery tables (scope item 1)
--   B. public.meetings — the sole source of meeting truth (scope item 2)
--   C. Attribution + a reply idempotency backstop (items 7, and the foundation PR 2 needs)
--
-- ⚠️ R2 GATES APPLYING THIS. Section A changes what a signed-in browser can read. The
-- founder has NOT yet verified what production actually serves on the anon/authenticated
-- role. Written, tested and proven here; applied only after R2 closes.
--
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE / DROP-then-CREATE.
-- ═══════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- A · TENANT ISOLATION — nine tables
--
-- The API connects with SUPABASE_SERVICE_ROLE_KEY (packages/db/src/client.ts:16), which
-- BYPASSES RLS. So none of this touches the backend. This is exactly and only the boundary
-- for what a signed-in client's BROWSER may read on the anon key.
--
-- Four states were found, not one, and each needs a different action:
--   · leads, icps                      RLS on, correct policy      → PRESERVED, asserted
--   · figsy_campaigns, figsy_enrollments,
--     figsy_replies, figsy_sent_emails RLS on, ZERO policies       → policies ADDED
--   · opt_out_blocklist                RLS on, DEFECTIVE policies  → REPLACED (see below)
--   · lead_pool, sourcing_ledger       RLS off                     → ENABLED, browser denied
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- The helper already exists (packages/db/src/schema.sql:256). Restated with the hardening
-- the rest of this migration uses, and NOT redefined loosely: SECURITY INVOKER means it
-- resolves as the caller, so it cannot become a privilege ladder, and an empty search_path
-- means an attacker-controlled schema cannot shadow `clients` or `auth.uid`.
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_client_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;

-- ── A1 · The four RLS-ON, ZERO-POLICY tables ────────────────────────────────────────────
--
-- ⚠️ WHY THIS IS A FIX AND NOT A TIGHTENING. RLS with no policy denies every row to the
-- authenticated role, and PostgREST reports that denial as an EMPTY SUCCESS — `{data: [],
-- error: null}`, `count: 0`. The client dashboard reads all four of these from the browser
-- (DashboardLive.tsx) and takes the empty result as truth: `if (count !== null)
-- setTotalSent(count)` sets ZERO. So on the current schema these tables do not leak — they
-- silently answer nothing, and the dashboard's own server-rendered numbers are overwritten
-- with zeros on hydration. Adding the policy is what makes the client's own data visible to
-- the client again, while still denying it to everyone else.

ALTER TABLE public.figsy_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figsy_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figsy_replies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figsy_sent_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "figsy_campaigns_own"   ON public.figsy_campaigns;
DROP POLICY IF EXISTS "figsy_enrollments_own" ON public.figsy_enrollments;
DROP POLICY IF EXISTS "figsy_replies_own"     ON public.figsy_replies;
DROP POLICY IF EXISTS "figsy_sent_emails_own" ON public.figsy_sent_emails;

CREATE POLICY "figsy_campaigns_own" ON public.figsy_campaigns
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "figsy_enrollments_own" ON public.figsy_enrollments
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "figsy_replies_own" ON public.figsy_replies
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

-- #637 added figsy_sent_emails.client_id precisely so this table could be attributed; the
-- dashboard's sent counter filters on it. Without it this policy could only be written as a
-- two-hop join through enrollments, which is why the column exists.
CREATE POLICY "figsy_sent_emails_own" ON public.figsy_sent_emails
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

-- ⚠️ SELECT ONLY, DELIBERATELY. The pre-existing `leads_own` and `icps_own` are FOR ALL,
-- which lets a browser write those tables directly. These four are delivery RECORDS — what
-- we sent, who replied, what a campaign did. A client editing their own reply history or
-- send log would be editing the evidence behind their own invoice. The browser reads them;
-- only the service role writes them. Every writer in the repo is already server-side.

-- ── A2 · opt_out_blocklist — the defective policies, replaced ────────────────────────────
--
-- 🔴 DISCOVERED DEFECT (BUILD-003 item 1, found by the Builder while scoping).
-- schema.sql:288-291 shipped:
--     create policy "blocklist_read"  ... for select using (auth.role() = 'authenticated');
--     create policy "blocklist_write" ... for insert with check (auth.role() = 'authenticated');
-- Neither carries a tenant predicate, on a table that HAS `blocked_by_client_id`. So any
-- signed-in client could read EVERY suppressed address on the platform — other clients'
-- prospects, by email — and could INSERT arbitrary addresses, globally suppressing anyone
-- they chose, because suppression takes effect across every K.I.N.D send path.
--
-- FOUNDER RULING, 29 Aug — suppression EFFECT is global, blocklist VISIBILITY is not:
--   · a legitimately suppressed address is blocked for every client, forever; a later client
--     cannot cause K.I.N.D to contact that person again;
--   · no client may browse, enumerate or infer another client's suppressed addresses — the
--     raw global list is operational infrastructure, not shared client data;
--   · a browser must not write global suppression AT ALL. Scoping the write to
--     `blocked_by_client_id = current_client_id()` is NOT sufficient: the row would still be
--     globally effective, so a malicious client could submit any person's address and
--     suppress them everywhere while looking perfectly well-behaved.
-- ⚠️ Recorded as a PRODUCT RULE. This says nothing about legal sufficiency and claims no
-- PECR compliance on its own.
--
-- Verified before removing the INSERT policy, per the founder's stop-condition: NO browser
-- or portal code writes this table. Every writer is server-side on the service role —
-- routes/leads.ts:71,776 · routes/figsy.ts:81,241 · routes/whatsapp.ts:103,112. Removing
-- the browser write breaks no existing workflow.

DROP POLICY IF EXISTS "blocklist_read"  ON public.opt_out_blocklist;
DROP POLICY IF EXISTS "blocklist_write" ON public.opt_out_blocklist;
DROP POLICY IF EXISTS "blocklist_own"   ON public.opt_out_blocklist;

-- A client sees ONLY what their own activity produced. Not the global list, and not a
-- global entry that happens to contain another tenant's address.
CREATE POLICY "blocklist_own" ON public.opt_out_blocklist
  FOR SELECT TO authenticated USING (blocked_by_client_id = public.current_client_id());

-- No INSERT/UPDATE/DELETE policy exists for `authenticated` by design. Suppression is
-- requested through the API, which verifies the caller and that the address belongs to a
-- contact that client is entitled to act on, and only then writes the global row.

-- ── A3 · The two RLS-off tables — browser denied outright ───────────────────────────────
--
-- Neither is client-facing, and neither gets a policy: RLS on with no policy for
-- `authenticated` is a deny, and the service role bypasses it, which is exactly the
-- intended boundary.
--
-- lead_pool has NO tenant column at all — it is the shared pool by design, so there is no
-- per-tenant predicate that could be written. Exposing it to a browser would expose every
-- other client's pooled identities.
--
-- sourcing_ledger DOES have client_id, and is still denied: it holds `cost_usd`, our
-- PROVIDER COST per record. A per-tenant read policy would hand every client our margin on
-- their own leads.

ALTER TABLE public.lead_pool       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_pool_no_browser"       ON public.lead_pool;
DROP POLICY IF EXISTS "sourcing_ledger_no_browser" ON public.sourcing_ledger;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- B · public.meetings — THE SOLE SOURCE OF MEETING TRUTH (scope item 2)
--
-- WHAT IT REPLACES. Meeting truth today is `figsy_replies.meeting_booked_at` — a nullable
-- timestamp on a REPLY row — and the count is re-derived independently in at least six
-- places (`figsy.ts:1253`, `company.ts:82`, `company.ts:259`, `figsy.ts:819`,
-- `leads.ts:427`, `morning-brief-deliver.ts:61`), each as `if (r.meeting_booked_at) n++`.
-- That shape cannot express any of the things the founder actually needs: it cannot tell a
-- HELD meeting from a NO-SHOW, cannot exclude a duplicate or a spam booking, counts a
-- reschedule twice, and has nowhere to record that a calendar write failed.
--
-- MEETING_BOOKED is the hard downstream product-outcome boundary (P v1 rule 21), so the
-- number this table produces is the number the whole commercial model is judged on.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.meetings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- The prospect, by REFERENCE. ⚠️ No name, no email, no phone is stored here: the founder's
  -- rule is that meeting truth adds NO additional persisted prospect identifier. Detaching
  -- the lead (erasure) must not leave a second copy of the person behind on this row.
  lead_id              uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  reply_id             uuid REFERENCES public.figsy_replies(id) ON DELETE SET NULL,

  -- Attribution, so a programme can be judged on the meetings it actually produced.
  programme_id         uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  batch_id             uuid REFERENCES public.programme_batches(id) ON DELETE SET NULL,

  -- ── THE FOUR STATES ──────────────────────────────────────────────────────────────────
  -- booked             a real booking we have CONFIRMED against the calendar
  -- booked_unverified  the prospect accepted, but the calendar write failed or is unproven.
  --                    ⚠️ A SEPARATE STATE ON PURPOSE. Recording it as `booked` would claim
  --                    a calendar entry that may not exist; dropping it would lose a real
  --                    meeting. It is a booking we cannot yet prove, and it says so.
  -- held               the meeting happened — requires explicit confirmation
  -- no_show            it did not — requires explicit confirmation
  state                text NOT NULL
                         CHECK (state IN ('booked', 'booked_unverified', 'held', 'no_show')),

  google_event_id      text,
  scheduled_at         timestamptz NOT NULL,
  booked_at            timestamptz NOT NULL DEFAULT now(),
  verified_at          timestamptz,
  held_confirmed_at    timestamptz,
  no_show_confirmed_at timestamptz,
  confirmed_by         text,

  -- ── RESCHEDULE COUNTS ONCE ───────────────────────────────────────────────────────────
  -- A reschedule INSERTS a new row and points back at the old one, and the old row is
  -- stamped `superseded_by`. History is preserved — both rows survive, so "this meeting
  -- moved twice" stays answerable — while only the surviving row counts.
  rescheduled_from     uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  superseded_by        uuid REFERENCES public.meetings(id) ON DELETE SET NULL,

  -- ── EXCLUSIONS ───────────────────────────────────────────────────────────────────────
  -- A duplicate, a spam booking, or someone outside the ICP is still a real row — deleting
  -- it would destroy the evidence of why the number moved — but it does not count.
  excluded_reason      text CHECK (excluded_reason IN ('duplicate', 'spam', 'outside_icp')),
  excluded_at          timestamptz,
  excluded_note        text,

  -- ⚠️ THE COUNT IS A COLUMN, NOT A CONVENTION. Six call sites each re-deriving "does this
  -- count?" is exactly how the old shape drifted. Generated and stored, so no reader can
  -- get it wrong and no reader can forget a clause.
  counts_toward_outcome boolean GENERATED ALWAYS AS (
    excluded_reason IS NULL AND superseded_by IS NULL AND state <> 'no_show'
  ) STORED,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- DUPLICATE google_event_id IS REJECTED. Partial, so the many rows with no calendar entry
-- (every booked_unverified) do not collide with each other on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_google_event_id_key
  ON public.meetings (google_event_id) WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS meetings_client_idx    ON public.meetings (client_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS meetings_programme_idx ON public.meetings (programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meetings_counting_idx  ON public.meetings (client_id) WHERE counts_toward_outcome;
CREATE INDEX IF NOT EXISTS meetings_lead_idx      ON public.meetings (lead_id) WHERE lead_id IS NOT NULL;

-- ── THE DATABASE INVARIANT ──────────────────────────────────────────────────────────────
--
-- ⚠️ WHY A TRIGGER AND NOT A CHECK. Every rule below spans columns and, for the reschedule
-- chain, spans ROWS — a CHECK constraint cannot see another row. And it lives in the
-- database rather than in `meeting-truth.ts` because the write layer is the discipline and
-- this is the guarantee: an operator with a SQL console, a future route, or a seed script
-- must not be able to write a meeting state that means nothing.
--
-- FAIL CLOSED AND LOUD: every violation RAISES. Nothing is coerced, defaulted or dropped.
CREATE OR REPLACE FUNCTION public.meetings_invariant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- HELD and NO-SHOW REQUIRE EXPLICIT CONFIRMATION. Neither may be inferred from the clock:
  -- a meeting whose time has passed is not evidence that anyone attended it.
  IF NEW.state = 'held' AND NEW.held_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'meetings: state=held requires held_confirmed_at — a meeting is never marked held by inference';
  END IF;

  IF NEW.state = 'no_show' AND NEW.no_show_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'meetings: state=no_show requires no_show_confirmed_at — a no-show is never marked by inference';
  END IF;

  -- It cannot be both.
  IF NEW.held_confirmed_at IS NOT NULL AND NEW.no_show_confirmed_at IS NOT NULL THEN
    RAISE EXCEPTION 'meetings: a meeting cannot be both held and a no-show';
  END IF;

  -- A confirmation without the matching state is a half-written record, which is how a
  -- "held" meeting ends up counted as merely booked.
  IF NEW.held_confirmed_at IS NOT NULL AND NEW.state <> 'held' THEN
    RAISE EXCEPTION 'meetings: held_confirmed_at is set but state is %', NEW.state;
  END IF;
  IF NEW.no_show_confirmed_at IS NOT NULL AND NEW.state <> 'no_show' THEN
    RAISE EXCEPTION 'meetings: no_show_confirmed_at is set but state is %', NEW.state;
  END IF;

  -- BOOKED means VERIFIED. This is the whole point of splitting the two booked states: a
  -- row may only claim `booked` once the calendar entry is proven, and the proof is the
  -- event id plus the verification stamp.
  IF NEW.state = 'booked' AND (NEW.verified_at IS NULL OR NEW.google_event_id IS NULL) THEN
    RAISE EXCEPTION 'meetings: state=booked requires verified_at and google_event_id — use booked_unverified when the calendar write is unproven';
  END IF;

  -- ...and the converse, so an unverified row cannot quietly carry proof it does not have.
  IF NEW.state = 'booked_unverified' AND NEW.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'meetings: state=booked_unverified cannot carry verified_at — verify it and promote it to booked';
  END IF;

  -- An exclusion must say why AND when; a reason with no timestamp is unauditable.
  IF (NEW.excluded_reason IS NULL) <> (NEW.excluded_at IS NULL) THEN
    RAISE EXCEPTION 'meetings: excluded_reason and excluded_at must be set together';
  END IF;

  -- RESCHEDULE COUNTS ONCE. A row pointing back at its predecessor is only honest if the
  -- predecessor is stamped as superseded — otherwise both count and one meeting becomes two.
  IF NEW.rescheduled_from IS NOT NULL THEN
    IF NEW.rescheduled_from = NEW.id THEN
      RAISE EXCEPTION 'meetings: a meeting cannot be rescheduled from itself';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = NEW.rescheduled_from AND m.superseded_by = NEW.id
    ) THEN
      RAISE EXCEPTION 'meetings: the meeting this one reschedules (%) must be stamped superseded_by=% in the same transaction — otherwise the reschedule counts twice', NEW.rescheduled_from, NEW.id;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.meetings_invariant() FROM PUBLIC;

DROP TRIGGER IF EXISTS meetings_invariant_trg ON public.meetings;
CREATE TRIGGER meetings_invariant_trg
  BEFORE INSERT OR UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.meetings_invariant();

-- ── HISTORY IS PRESERVED — DELETE IS REFUSED ────────────────────────────────────────────
--
-- Meeting history is the evidence behind the one number the commercial model is judged on.
-- An excluded meeting is excluded, never deleted, so "why did the count drop?" always has an
-- answer. Erasure of the PERSON is handled by detaching the lead (below), which is a
-- different operation from destroying the record that a meeting occurred.
CREATE OR REPLACE FUNCTION public.meetings_no_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'meetings: rows are never deleted — exclude the meeting (excluded_reason) or detach the lead. Meeting history is the evidence behind the outcome count.';
END;
$$;

REVOKE ALL ON FUNCTION public.meetings_no_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS meetings_no_delete_trg ON public.meetings;
CREATE TRIGGER meetings_no_delete_trg
  BEFORE DELETE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.meetings_no_delete();

-- ── ERASURE — google_event_id IS CLEARED WITH LEAD DETACHMENT ───────────────────────────
--
-- When a lead is erased, `lead_id` goes NULL via ON DELETE SET NULL. The calendar event id
-- must go with it: a Google event id resolves, in Google, to an invitee's email address, so
-- leaving it behind would keep a pointer to the erased person in a table that is supposed to
-- hold none. The MEETING survives (the outcome happened); the route back to the person does
-- not.
--
-- ⚠️ This is a data-hygiene mechanism. It makes NO claim of legal sufficiency for any
-- erasure regime, and #704 (retention duration) remains unresolved and untouched.
CREATE OR REPLACE FUNCTION public.meetings_clear_event_on_detach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.lead_id IS NOT NULL AND NEW.lead_id IS NULL THEN
    NEW.google_event_id := NULL;
    -- A row that lost its proof cannot keep claiming to be verified.
    IF NEW.state = 'booked' THEN
      NEW.state := 'booked_unverified';
      NEW.verified_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.meetings_clear_event_on_detach() FROM PUBLIC;

DROP TRIGGER IF EXISTS meetings_clear_event_trg ON public.meetings;
CREATE TRIGGER meetings_clear_event_trg
  BEFORE UPDATE OF lead_id ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.meetings_clear_event_on_detach();

-- Meetings are tenant data: the client sees their own, the browser never writes them.
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meetings_own" ON public.meetings;
CREATE POLICY "meetings_own" ON public.meetings
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- C · ATTRIBUTION + THE REPLY IDEMPOTENCY BACKSTOP
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ── C1 · figsy_enrollments programme attribution (the foundation PR 2 needs) ────────────
-- Which programme, and which 250-batch, put this person into a sequence. Without it a
-- programme's delivery cannot be tied back to the authority that paid for it.
ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL;
ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.programme_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS figsy_enrollments_programme_idx
  ON public.figsy_enrollments (programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS figsy_enrollments_batch_idx
  ON public.figsy_enrollments (batch_id) WHERE batch_id IS NOT NULL;

-- ── C2 · Reply idempotency — a DATABASE backstop, deliberately fail-open on NULL ─────────
--
-- A provider redelivering a webhook must not create a second reply: a duplicate reply is a
-- duplicate classification, a duplicate meeting and a duplicate outcome. Application-level
-- dedupe is not enough, because there are three insert sites (`reply-pipeline.ts:156`,
-- `manual-reply.ts:114`, `routes/figsy.ts:2297`) and the next one added will not know.
--
-- ⚠️ FAIL-OPEN WHEN THERE IS NO PROVIDER ID, AND THAT IS THE DELIBERATE CHOICE. The index is
-- PARTIAL. A reply that arrives without a provider message id — a manual reply an operator
-- types, a provider that sends none — is NOT deduplicated, because the alternative is worse:
-- keying on (campaign, lead, body) would silently DISCARD a real second reply from a person
-- who wrote the same short line twice ("yes", "thanks"). Losing a genuine reply is a worse
-- failure than storing a rare duplicate, so the backstop protects exactly the case where the
-- provider gives us something authoritative to key on.
ALTER TABLE public.figsy_replies
  ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS figsy_replies_provider_message_id_key
  ON public.figsy_replies (provider_message_id) WHERE provider_message_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_replies.provider_message_id IS
  'Provider-assigned message id (Resend/Smartlead/Instantly). Unique when present; NULL is deliberately NOT deduplicated — see 20260829_build003_data_truth.sql.';
