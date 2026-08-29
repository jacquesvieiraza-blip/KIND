-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 2 — public.meetings, THE SOLE SOURCE OF MEETING TRUTH
--
-- ⚠️ NOT GATED BY R2. Split out from delivery_rls on purpose: R2 gates browser access, and
-- meeting truth must not wait behind it. This migration grants the browser NOTHING AT ALL —
-- the table is RLS-enabled with no policy, so it is service-role only.
--
-- WHAT IT REPLACES. Meeting truth today is `figsy_replies.meeting_booked_at` — a nullable
-- timestamp on a REPLY row — and the count is re-derived independently in at least six
-- places (figsy.ts:1253, figsy.ts:819, company.ts:82, company.ts:259, leads.ts:427,
-- morning-brief-deliver.ts:61), each as `if (r.meeting_booked_at) n++`. That shape cannot
-- express what the founder actually needs: it cannot tell a HELD meeting from a NO_SHOW,
-- cannot exclude a duplicate or a spam booking, counts a reschedule twice, and has nowhere
-- to record that a calendar write failed.
--
-- MEETING_BOOKED is the hard downstream product-outcome boundary (P v1 rule 21), so the
-- number this table produces is the number the commercial model is judged on.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.meetings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ⚠️ RESTRICT, NOT CASCADE. A client with meeting history cannot be deleted out from under
  -- the outcome record. Deleting the client is refused at the database, loudly, rather than
  -- silently taking the evidence with it — and this FK is the ONLY prohibition needed, so no
  -- second custom delete trigger exists on this table.
  client_id            uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,

  -- The prospect, by REFERENCE ONLY. ⚠️ No name, no email, no phone is stored here: meeting
  -- truth adds NO additional persisted prospect identifier, so erasing the lead does not
  -- leave a second copy of the person behind on this row.
  lead_id              uuid REFERENCES public.leads(id)            ON DELETE SET NULL,
  campaign_id          uuid REFERENCES public.figsy_campaigns(id)  ON DELETE SET NULL,
  enrollment_id        uuid REFERENCES public.figsy_enrollments(id) ON DELETE SET NULL,
  programme_id         uuid REFERENCES public.programmes(id)       ON DELETE SET NULL,

  -- ── THE FOUR STATES ──────────────────────────────────────────────────────────────────
  -- BOOKED             a booking we have CONFIRMED against the calendar
  -- BOOKED_UNVERIFIED  the prospect accepted, but the calendar write failed or is unproven.
  --                    ⚠️ A SEPARATE STATE ON PURPOSE. Recording it as BOOKED would claim a
  --                    calendar entry that may not exist; dropping it would lose a real
  --                    meeting. It is a booking we cannot yet prove, and it says so.
  -- HELD               the meeting happened — explicit confirmation only
  -- NO_SHOW            it did not — explicit confirmation only
  state                text NOT NULL
                         CHECK (state IN ('BOOKED', 'BOOKED_UNVERIFIED', 'HELD', 'NO_SHOW')),

  google_event_id      text,
  scheduled_at         timestamptz NOT NULL,
  booked_at            timestamptz NOT NULL DEFAULT now(),
  verified_at          timestamptz,
  held_confirmed_at    timestamptz,
  no_show_confirmed_at timestamptz,
  confirmed_by         text,

  -- A reschedule INSERTS a new row and points back; the old row is stamped `superseded_by`.
  -- History is preserved — both rows survive, so "this meeting moved twice" stays answerable
  -- — while only the surviving row counts.
  rescheduled_from     uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  superseded_by        uuid REFERENCES public.meetings(id) ON DELETE SET NULL,

  -- A duplicate, a spam booking or someone outside the ICP is still a real row: deleting it
  -- would destroy the evidence of why the number moved. It simply does not count.
  excluded_reason      text CHECK (excluded_reason IN ('duplicate', 'spam', 'outside_icp')),
  excluded_at          timestamptz,
  excluded_note        text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- ── CONSTRAINTS — the invariant, as CHECKs rather than a trigger ─────────────────────

  -- HELD and NO_SHOW REQUIRE EXPLICIT CONFIRMATION. Neither may be inferred from the clock:
  -- a meeting whose time has passed is not evidence that anyone attended it.
  CONSTRAINT meetings_held_requires_confirmation
    CHECK (state <> 'HELD' OR held_confirmed_at IS NOT NULL),
  CONSTRAINT meetings_no_show_requires_confirmation
    CHECK (state <> 'NO_SHOW' OR no_show_confirmed_at IS NOT NULL),

  -- A confirmation without its state is a half-written record — the shape that turns a HELD
  -- meeting into one merely counted as booked.
  CONSTRAINT meetings_held_stamp_matches_state
    CHECK (held_confirmed_at IS NULL OR state = 'HELD'),
  CONSTRAINT meetings_no_show_stamp_matches_state
    CHECK (no_show_confirmed_at IS NULL OR state = 'NO_SHOW'),
  CONSTRAINT meetings_not_both_outcomes
    CHECK (held_confirmed_at IS NULL OR no_show_confirmed_at IS NULL),

  -- BOOKED MEANS VERIFIED. This is the whole point of splitting the two booked states.
  -- ⚠️ It requires `verified_at` and NOT `google_event_id`: erasure clears the event pointer
  -- while the booking stays verified, because THAT A BOOKING WAS VERIFIED IS HISTORICAL
  -- OUTCOME EVIDENCE. Requiring the event id here would make erasure impossible without
  -- falsifying the outcome.
  CONSTRAINT meetings_booked_requires_verification
    CHECK (state <> 'BOOKED' OR verified_at IS NOT NULL),
  CONSTRAINT meetings_unverified_carries_no_proof
    CHECK (state <> 'BOOKED_UNVERIFIED' OR verified_at IS NULL),

  -- ⚠️ NO ORPHAN EVENT POINTER — and this constraint is load-bearing twice over.
  -- A google_event_id resolves, inside Google, to an invitee's email address. So an event id
  -- with no lead is a pointer back to a person this row is not supposed to identify.
  -- It is ALSO the backstop for the erasure trigger below: `lead_id` is ON DELETE SET NULL,
  -- so if that trigger is ever dropped, deleting a lead nulls `lead_id` while leaving
  -- `google_event_id` behind — and this CHECK makes the DELETE ITSELF FAIL, loudly, instead
  -- of quietly leaving a route back to an erased person.
  CONSTRAINT meetings_no_orphan_event_pointer
    CHECK (google_event_id IS NULL OR lead_id IS NOT NULL),

  -- An exclusion must say why AND when; a reason with no timestamp is unauditable.
  CONSTRAINT meetings_exclusion_is_complete
    CHECK ((excluded_reason IS NULL) = (excluded_at IS NULL)),

  CONSTRAINT meetings_not_rescheduled_from_self
    CHECK (rescheduled_from IS NULL OR rescheduled_from <> id)
);

-- DUPLICATE google_event_id IS REJECTED. Partial, so the many rows with no calendar entry —
-- every BOOKED_UNVERIFIED, and every erased row — do not collide with each other on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_google_event_id_key
  ON public.meetings (google_event_id) WHERE google_event_id IS NOT NULL;

-- ⚠️ LIVE-BOOKING UNIQUENESS — one live booking per lead, enforced by the DATABASE.
-- Two replies arriving at once, or a provider redelivering a webhook, would otherwise each
-- read "no meeting yet" and each insert one: the classic read-then-write race, and here it
-- inflates the single number the commercial model is judged on. A partial unique index makes
-- the second writer lose at commit rather than at a check it never ran.
-- Superseded (rescheduled) and excluded rows are outside the index, so a reschedule and an
-- excluded duplicate can both coexist with the live booking they relate to.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_one_live_booking_per_lead
  ON public.meetings (lead_id)
  WHERE lead_id IS NOT NULL
    AND state IN ('BOOKED', 'BOOKED_UNVERIFIED')
    AND superseded_by IS NULL
    AND excluded_reason IS NULL;

CREATE INDEX IF NOT EXISTS meetings_client_idx    ON public.meetings (client_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS meetings_programme_idx ON public.meetings (programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meetings_lead_idx      ON public.meetings (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meetings_state_idx     ON public.meetings (client_id, state);

-- ── ERASURE — THE POINTER GOES, THE OUTCOME STAYS ──────────────────────────────────────
--
-- Fires BEFORE a lead is deleted. It nulls `lead_id` and `google_event_id` together, which
-- is the only pair that satisfies meetings_no_orphan_event_pointer.
--
-- ⚠️ WHAT IT DELIBERATELY DOES NOT DO: it does not demote BOOKED to BOOKED_UNVERIFIED and it
-- does not clear `verified_at`. The booking WAS verified; that is historical outcome evidence
-- and erasing it would falsify the record rather than protect the person. What disappears is
-- the route back to the prospect and to the calendar event — not the fact that a meeting
-- happened.
--
-- ⚠️ Data hygiene, not a legal claim. This makes NO assertion of sufficiency for any erasure
-- regime, and #704 (retention duration) remains unresolved and untouched.
CREATE OR REPLACE FUNCTION public.meetings_detach_erased_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.meetings
     SET lead_id         = NULL,
         google_event_id = NULL,
         updated_at      = now()
   WHERE lead_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.meetings_detach_erased_lead() FROM PUBLIC;

DROP TRIGGER IF EXISTS meetings_detach_erased_lead_trg ON public.leads;
CREATE TRIGGER meetings_detach_erased_lead_trg
  BEFORE DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.meetings_detach_erased_lead();

-- ── RLS ON, ZERO BROWSER POLICIES — service-role only ──────────────────────────────────
--
-- ⛓️ CORRECTED 29 Aug. The first cut of this file gave meetings a tenant-scoped SELECT
-- policy so a client's browser could read its own meetings. The accepted spec is stricter
-- and this follows it: RLS enabled with NO policy, which for `authenticated` IS the deny,
-- while the service role bypasses it — the same shape as lead_pool and sourcing_ledger.
--
-- The consequence is deliberate: meeting truth reaches a client through the API, which can
-- apply the counting rules (exclusions, supersessions, the four states) rather than handing
-- a browser raw rows it would have to interpret for itself. Direct table access is exactly
-- how six call sites each grew their own definition of "does this count".
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meetings_own" ON public.meetings;
