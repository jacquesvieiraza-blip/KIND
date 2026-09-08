-- ═════════════════════════════════════════════════════════════════════════════════════════
-- THE CLIENT REVIEWS THE EXACT THING THEY LATER APPROVE (founder-locked 8 Sep)
--
-- Four small additions. All nullable, none backfilled, nothing changes until code reads them.
--
-- ── ① programmes.review_preparation_* — THE FREEZE MOVES TO THE REVIEW BOUNDARY ─────────
--
-- 🛑 WHAT WAS INSUFFICIENT. The approved hash was written at APPROVED, which proves what was
-- approved and says nothing about what was REVIEWED. A programme could sit in
-- READY_FOR_APPROVAL, have its enrolment set or its wording change underneath the client, and
-- the approval would faithfully record the NEW state — a perfect record of consent to
-- something the client never read.
--
-- So the snapshot is taken TWICE, by the same deterministic builder:
--
--     preparation complete → FREEZE review snapshot → READY_FOR_APPROVAL
--     client reads exactly that → APPROVED → approved hash = the REVIEWED hash
--
-- ⚠️ APPROVAL COPIES THE REVIEWED SNAPSHOT, IT DOES NOT TAKE A FRESH ONE. Taking a fresh
-- snapshot at approval is precisely the defect above: it would record whatever the work had
-- become. Approval instead re-computes the current state, REFUSES if it differs from the
-- reviewed hash, and then stores the reviewed snapshot as the approved one.
--
-- ── ② programmes.send_schedule — WHEN OUTBOUND IS ALLOWED TO LEAVE ──────────────────────
--
-- 🛑 THERE WAS NO SCHEDULE AT ALL. Not a default, not a constant, not a disabled feature —
-- `getDay`, `getHours`, "business hours" and "send window" appear nowhere in the send path.
-- Launching like that means outbound at 03:00 local on a Sunday, which is a reputation
-- problem before it is a taste problem.
--
-- ⚠️ ONE JSONB, NOT A SCHEDULER PRODUCT. `{ days: [1..5], start: "08:30", end: "17:00",
-- default_tz: "Europe/London" }` and nothing else. NULL means NO SCHEDULE CONFIGURED, and the
-- guard treats that as REFUSE for programme work — a missing schedule is not permission to
-- send at any hour.
--
-- ── ③ figsy_enrollments.sequence_id — THE ENROLMENT NAMES ITS SEQUENCE ──────────────────
--
-- 🛑 SO "WHICH WORDS WILL THIS PERSON RECEIVE" IS A POSITIVE FACT. An enrolment carried a
-- COPY of the steps and no pointer to where they came from, so nothing could check that the
-- copy still matched the canonical sequence the customer approved. This is the smallest column
-- that makes that check possible; nullable and never backfilled, because a legacy enrolment
-- genuinely does not have one and guessing would be the same relinking error the campaign
-- column exists to prevent.
-- ═════════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_preparation_hash     text,
  ADD COLUMN IF NOT EXISTS review_preparation_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS review_preparation_at       timestamptz,
  ADD COLUMN IF NOT EXISTS send_schedule               jsonb;

COMMENT ON COLUMN public.programmes.review_preparation_hash IS
  'sha256 of the canonical preparation snapshot FROZEN at the transition into READY_FOR_APPROVAL - the exact material the client is shown. Approval refuses unless the current preparation still matches it, and then stores the REVIEWED snapshot as the approved one. Taking a fresh snapshot at approval instead would faithfully record consent to something the client never read.';

COMMENT ON COLUMN public.programmes.review_preparation_snapshot IS
  'The canonical snapshot behind review_preparation_hash, kept so a change can be EXPLAINED and not merely detected. Exactly one snapshot, replaced only by a re-freeze.';

COMMENT ON COLUMN public.programmes.review_preparation_at IS
  'When the review snapshot was frozen. Separate from approved_preparation_at: a re-freeze after a material change must move this without rewriting the approval time.';

COMMENT ON COLUMN public.programmes.send_schedule IS
  'When outbound may leave for this programme: { days: [1..7 Mon..Sun], start: "HH:MM", end: "HH:MM", default_tz: "IANA zone" }, evaluated in the RECIPIENT''S local timezone where their country is known and in default_tz otherwise. NULL means NO SCHEDULE CONFIGURED, which the guard treats as REFUSE for programme work - a missing schedule is not permission to send at any hour.';

ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS sequence_id uuid REFERENCES public.figsy_sequences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS figsy_enrollments_sequence_idx
  ON public.figsy_enrollments (sequence_id) WHERE sequence_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_enrollments.sequence_id IS
  'The canonical figsy_sequences row this enrolment was built from. Written by programme preparation only; NULL means a legacy enrolment whose words came from the campaign settings copy, which is the honest reading of every row written before this column and is never backfilled. The programme send path refuses an enrolment whose sequence_id is not the programme''s current canonical sequence.';
