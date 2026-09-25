-- ── NO-SHOWS AND CANCELLATIONS, AND WHO THEY WERE — 25 Sep 2026 (R141 · R166 · board #2351, P5c) ──
--
-- The Terms (R141): if the PROSPECT does not attend or cancels, we reschedule once at no extra
-- charge; if the CLIENT cancels or does not attend, the meeting counts as delivered; a
-- rescheduled meeting counts once. The meeting record could say NO_SHOW but not WHO was absent,
-- and could not say "cancelled" at all — so the free reschedule could be neither granted nor
-- refused on the record.
--
-- EXPAND ONLY: nullable columns, no default, no backfill. Both-or-neither is enforced.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS absence_kind        text,
  ADD COLUMN IF NOT EXISTS absence_party       text,
  ADD COLUMN IF NOT EXISTS absence_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS absence_recorded_by text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_absence_values') THEN
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_absence_values
      CHECK ((absence_kind IS NULL OR absence_kind IN ('no_show', 'cancelled'))
         AND (absence_party IS NULL OR absence_party IN ('prospect', 'client')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_absence_is_complete') THEN
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_absence_is_complete
      CHECK ((absence_kind IS NULL) = (absence_party IS NULL)
         AND (absence_kind IS NULL) = (absence_recorded_at IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN public.meetings.absence_party IS
  'Who was absent or cancelled: prospect (one free reschedule, R141) | client (counts as delivered).';
