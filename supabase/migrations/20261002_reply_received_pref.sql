-- ── THE CLIENT'S "REPLY RECEIVED" SWITCH — 2 Oct 2026 (board #2564 · R191) ─────────────────
--
-- The founder ruled that a client is told — by email and on their phone — when a prospect
-- replies and sounds interested, and that the "Reply received" switch in Settings stops saying
-- "Soon" (*"Only interested replies"*, chains R87). The thing that must obey the switch is the
-- reply webhook, which cannot read a browser, so the preference is a column like its siblings
-- (`daily_brief_enabled`, `weekly_digest_enabled`, `campaign_paused_emails_enabled`).
--
-- EXPAND ONLY: one nullable boolean, no DEFAULT (the #599 precedent). NULL means "never chose",
-- which the code reads as ON, so applying this changes nobody's mail on its own.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS reply_received_emails_enabled boolean;

COMMENT ON COLUMN public.clients.reply_received_emails_enabled IS
  'The client''s "Reply received" switch. NULL = never chose = on. false = no email or phone alert when a prospect sounds interested.';
