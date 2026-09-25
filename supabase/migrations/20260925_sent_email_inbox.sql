-- ── WHICH MAILBOX SENT THIS EMAIL — 25 Sep 2026 (R166 ⑥ · board #2347, P1) ────────────────
--
-- A mailbox's daily limit (`client_inboxes.daily_cap`) was counted IN MEMORY, per send run,
-- because `figsy_sent_emails` had no column naming the mailbox that sent. The send cron runs
-- every two hours, so a box capped at 30 a day could send about 30 per run. The founder:
-- "i am very seriouos about how many leads we also try and attempt. the barriers need to be
-- there." With this column the run starts from what each box has ALREADY sent today.
--
-- EXPAND ONLY: one nullable column, no default, no backfill (older rows simply don't count
-- toward today), and an index for the per-box, per-day count. ON DELETE SET NULL so removing
-- a mailbox never deletes send history.
ALTER TABLE public.figsy_sent_emails
  ADD COLUMN IF NOT EXISTS inbox_id uuid REFERENCES public.client_inboxes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS figsy_sent_emails_inbox_sent_idx
  ON public.figsy_sent_emails (inbox_id, sent_at);

COMMENT ON COLUMN public.figsy_sent_emails.inbox_id IS
  'The client mailbox this email left from. Read to count each mailbox''s sends today against client_inboxes.daily_cap.';
