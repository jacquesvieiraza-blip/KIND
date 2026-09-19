-- ─────────────────────────────────────────────────────────────────────────────────────────
-- ONE CANONICAL SEQUENCE PER CAMPAIGN — the words the customer approves cannot be ambiguous
--
-- 🛑 WHAT HAPPENED, MEASURED IN A CERTIFICATION RUN (19 Sep 2026). A programme reached
-- `SOURCING`, its sourcing run settled, and `advanceAfterSettlement` began preparing it in the
-- background. An operator pressed `prepare-for-review` at the same moment. Both paths call
-- `applyProgrammeSequence`, which READS `figsy_sequences` for the campaign, finds none, and
-- INSERTS. Both found none. Both inserted.
--
-- From that instant the programme was PERMANENTLY UNPREPARABLE: `resolveProgrammeChain`
-- refuses with *"This campaign has 2 sequences, so the words the customer would approve are
-- ambiguous"* — correctly, because nobody can say which words the customer would be
-- approving — and every downstream journey (preparation, freeze, client approval, Make Live,
-- Run) is closed behind it. The client's programme is paid for and cannot be worked.
--
-- ⚠️ THE CODE ALREADY STATED THIS RULE AND COULD NOT KEEP IT. `applyProgrammeSequence`'s own
-- comment reads *"EXACTLY ONE CANONICAL ROW PER CAMPAIGN. Two is not a duplicate, it is a
-- programme `resolveProgrammeChain` will refuse to resolve — so finding two is reported, never
-- silently resolved by picking one."* A read-then-insert cannot promise that; only a unique
-- key can. This is the same shape, and the same fix, as `clients_one_per_user` (J1-C1),
-- `automatic_work_one_live_per_subject` (XC-6) and `programme_batches_one_running_uidx`.
--
-- ⚠️ EXPAND ONLY, AND IT CREATES NOTHING. One partial unique index. No column, no default, no
-- backfill, no row touched.
--
-- 🛑 AND IT REFUSES TO CREATE ITSELF OVER EXISTING DUPLICATES, DELIBERATELY. Which of two
-- sequences a client would have approved is a decision about somebody's campaign, not a
-- migration's — so where duplicates already exist this reports them by campaign and leaves the
-- table alone. The application keeps refusing those programmes exactly as it does today, which
-- is the safe direction, and an operator resolves them in Vida.
--
-- Canonical copy of the PENDING_MIGRATIONS entry `20260919_one_canonical_sequence_per_campaign`.
-- ─────────────────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(campaign_id::text, ', ')
    INTO dupes
    FROM (
      SELECT campaign_id
        FROM public.figsy_sequences
       WHERE campaign_id IS NOT NULL
       GROUP BY campaign_id
      HAVING count(*) > 1
       LIMIT 50
    ) d;

  IF dupes IS NOT NULL THEN
    RAISE NOTICE 'figsy_sequences_one_per_campaign NOT created: these campaigns already carry more than one canonical sequence (%). Resolve them in Vida first — which words the customer would approve is not a migration''s decision.', dupes;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS figsy_sequences_one_per_campaign
      ON public.figsy_sequences (campaign_id)
      WHERE campaign_id IS NOT NULL;
    RAISE NOTICE 'figsy_sequences_one_per_campaign is in place — a second canonical sequence for one campaign is now refused by the database.';
  END IF;
END $$;

COMMENT ON TABLE public.figsy_sequences IS
  'The canonical sequence a customer approves. EXACTLY ONE row per campaign, enforced by figsy_sequences_one_per_campaign (partial unique, 20260919): two rows make resolveProgrammeChain refuse for ever, which closes preparation, freeze, approval, Make Live and Run behind it. Rows with campaign_id NULL are historical client-scoped work and are never candidates for programme resolution.';
