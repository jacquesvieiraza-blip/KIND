-- ═════════════════════════════════════════════════════════════════════════════════════════
-- THE EXACT WORK APPROVED IS THE EXACT WORK ALLOWED TO RUN (founder-locked 7 Sep)
--
-- Two small additions, both nullable, both un-backfilled, neither of which changes a single
-- existing row or any existing behaviour until code reads them.
--
-- ── ① figsy_sequences.campaign_id — A POSITIVE LINK, NOT AN INFERENCE ───────────────────
--
-- 🛑 THE DEFECT. `figsy_sequences` is CLIENT-scoped and nothing else. So "this programme's
-- sequence" could only ever be answered by picking one of the client's sequences — the newest,
-- the first, whichever the query happened to order to the top. House carries sequences from a
-- retired per-lead desk, so that answer is not merely imprecise: it can return the words of an
-- old campaign as the words a customer is being asked to approve for a new programme.
--
-- ⚠️ THIS IS THE SAME CLASS OF BUG THE CAMPAIGN SIDE ALREADY CLOSED. `autoEnrollLead` refuses
-- to fall back to "the client's newest active campaign" for programme work (2 Sep, PR A2)
-- precisely because belonging to the same CLIENT is not belonging to the same WORK. The
-- sequence side had no column with which to make the same refusal. Now it does, and the
-- programme path resolves positively:
--
--     programme → icps.programme_id → figsy_campaigns.icp_id → figsy_sequences.campaign_id
--
-- ⚠️ NULLABLE, NO DEFAULT, NO BACKFILL — AND THE ABSENCE OF A BACKFILL IS THE POINT.
-- Every sequence that exists today was written before this column and belongs to whatever it
-- belonged to; guessing a campaign for it would relink historical work to current programme
-- work by assertion, which is exactly the leakage this column exists to stop. A NULL here
-- means "client-scoped, historical" — which is the honest reading of every existing row, and
-- the programme path treats it as NOT FOUND rather than as a candidate.
--
-- ON DELETE SET NULL, never CASCADE: deleting a campaign must not delete the words.
--
-- ── ② programmes.approved_preparation_* — WHAT WAS APPROVED, SO A CHANGE CAN BE SEEN ────
--
-- Approval today records only WHEN somebody approved. It records nothing about WHAT they
-- approved, so a sequence rewritten, a cadence retimed, a sender swapped or an enrolment set
-- replaced after approval carries the old consent forward silently — and everybody downstream
-- reads that consent as permission to send THIS.
--
-- ⚠️ THIS IS NOT A VERSIONING PLATFORM, and it must not grow into one. Three columns: the
-- canonical snapshot (so we can prove what was approved), its hash (so a comparison is one
-- string equality rather than a deep diff nobody can audit), and when it was taken. Full
-- product versioning is post-launch and deliberately out of scope.
--
-- ⚠️ WRITTEN AT THE APPROVAL BOUNDARY AND NOWHERE ELSE. They are set in the SAME conditional
-- UPDATE that writes `status = 'APPROVED'`, so a programme can never hold an approved snapshot
-- it was not approved with — and, just as importantly, a snapshot is never stamped "approved"
-- before an approval actually happens.
-- ═════════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.figsy_sequences
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.figsy_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS figsy_sequences_campaign_idx
  ON public.figsy_sequences (campaign_id) WHERE campaign_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_sequences.campaign_id IS
  'The campaign these words belong to. Written only when a sequence is authored for a campaign; NULL means client-scoped historical work, which is the honest reading of every row written before this column existed and is never backfilled. Programme work resolves programme -> icps.programme_id -> figsy_campaigns.icp_id -> figsy_sequences.campaign_id and treats NULL as NOT FOUND, because belonging to the same client is not belonging to the same work.';

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS approved_preparation_hash     text,
  ADD COLUMN IF NOT EXISTS approved_preparation_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS approved_preparation_at       timestamptz;

COMMENT ON COLUMN public.programmes.approved_preparation_hash IS
  'sha256 of the canonical preparation snapshot the customer actually approved: batch and its membership, campaign, sequence, ordered message steps, cadence, sender identity and the prepared enrolment set. Deterministic and free of timestamps, so it changes only when the WORK changes. Written in the same conditional UPDATE as status = APPROVED and never anywhere else. Outreach authority compares the current preparation against it and refuses when they differ - the exact work approved is the exact work allowed to run.';

COMMENT ON COLUMN public.programmes.approved_preparation_snapshot IS
  'The canonical snapshot behind approved_preparation_hash, kept so a change can be EXPLAINED and not merely detected. Not a version history: exactly one snapshot, the approved one, replaced only by a re-approval.';

COMMENT ON COLUMN public.programmes.approved_preparation_at IS
  'When the approved preparation snapshot was taken. Deliberately separate from approved_at: they are written together today, and a future re-approval must be able to move this without rewriting the original approval time.';
