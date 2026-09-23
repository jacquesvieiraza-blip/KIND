-- ── THE CLIENT CAN SAY NO AT APPROVAL — FOUNDER-APPROVED, 23 Sep 2026 (Section 4) ────────
--
-- ── WHAT WAS MISSING, AND IT WAS THE WHOLE OF ONE SIDE OF THE CONVERSATION ──────────────
--
-- The Approval screen let a client APPROVE and nothing else. If the people were wrong, or the
-- emails were wrong, there was no reject, no "ask for changes", and no box to say why. The only
-- sentence pointing anywhere read *"If anything changes, we will ask you again"* -- which
-- describes US changing something, not them objecting to it.
--
-- Every stage upstream lets them push back: the Brief is theirs to correct, Proof has a widen
-- route and a calibration hand-off, targeting is editable throughout. The one screen where they
-- approve real outreach to real people was the screen with no way to disagree.
--
-- ── WHY THEIR WORDS NEED A COLUMN ───────────────────────────────────────────────────────
--
-- `pause_reason` is a closed set -- 'client' | 'quality' | 'icp_change' -- and it answers WHICH
-- KIND of pause this is, not what the client actually said. Folding a sentence into it would
-- break the enum and lose the sentence; recording only the enum would page an operator with
-- "client paused" and nothing to act on, which is the shape that makes an exception rail stop
-- being read.
--
-- 🛑 AND IT IS THEIR OWN WORDS, NOT A CATEGORY. Founder-locked 22 Sep, for the equivalent
-- moment at Proof: *"we cant guess peoples way of speaking ever."* A dropdown of reasons here
-- would make them choose OUR word for their objection.
--
-- ⚠️ THE PAUSE ITSELF IS NOT NEW. `pauseProgramme` already exists, is idempotent, and keeps the
-- status a programme must return to. This adds what it could never carry: why.
--
-- Single-step, idempotent (IF NOT EXISTS throughout). Safe to re-run.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS approval_concern text;

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS approval_concern_at timestamptz;

-- ⚠️ A RAISED CONCERN CARRIES THE MOMENT IT WAS RAISED. Words with no timestamp cannot be
-- ordered against the version they were about, and the freeze this objects to is versioned.
DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_approval_concern_dated
    CHECK (approval_concern IS NULL OR approval_concern_at IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
