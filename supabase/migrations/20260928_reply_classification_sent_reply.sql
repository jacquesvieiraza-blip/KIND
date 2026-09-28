-- ── AN OPERATOR'S OWN REPLY IS KEPT — 28 Sep 2026 (end-to-end check, C8) ─────────────────────
--
-- `manual-reply.ts` records a reply the founder sends from Vida as a `figsy_replies` row with
-- classification 'sent_reply'. The 3 Jun rule (`figsy_replies_classification_check`) does not
-- allow that value, and the insert's error was never checked — so the email went out and the
-- record of it was silently lost.
--
-- The rule is REPLACED with the same list plus 'sent_reply'. NOT VALID, because this migration
-- only widens: rows already there are not re-judged, and every new row is checked.
-- New name, because one constraint has one owning migration (constraint-ownership.test.ts).
ALTER TABLE public.figsy_replies DROP CONSTRAINT IF EXISTS figsy_replies_classification_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'figsy_replies_classification_values_check') THEN
    ALTER TABLE public.figsy_replies ADD CONSTRAINT figsy_replies_classification_values_check
      CHECK (classification IS NULL OR classification IN (
        'hot','warm','cold',
        'interested','not_interested',
        'opt_out','unsubscribe',
        'out_of_office','wrong_person','referral','other',
        'sent_reply'
      )) NOT VALID;
  END IF;
END $$;
