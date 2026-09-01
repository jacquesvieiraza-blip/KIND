-- ── NOTIFICATION PREFERENCES + REFERRAL HANDOFF (BUILD-004A-2D, 31 Aug 2026) ──────────
--
-- ⚠️ THIS FILE IS THE CANONICAL COPY AND IT DOES NOT RUN. The only thing that executes a
-- migration in this product is `PENDING_MIGRATIONS` in apps/api/src/lib/pending-migrations.ts,
-- run by the founder from Vida → Engine → Run. A .sql file on disk LOOKS applied and is not:
-- that mistaken reading is #383, where an RPC sat here for 33 days doing nothing.
-- This statement is registered there under key `20260831_notification_prefs_and_referral_handoff`.
--
-- WHAT WAS BROKEN (the 4A-2D audit). The Settings notification panel showed three rows badged
-- "Soon" with DISABLED switches — and the crons behind them ran anyway: /digest/weekly every
-- Monday and /figsy/check-performance every morning. A client was receiving email the product
-- told them did not exist yet, with no way to stop it. #326 wrote "Soon" when those toggles
-- genuinely did nothing; the emails were built afterwards and nobody returned to the switch.
--
-- ⚠️ THE PREFERENCE MUST BE A COLUMN, NOT localStorage. The other panel rows stored their
-- state in the browser, which is exactly why they never worked: the thing that has to obey a
-- notification preference is a cron, and a cron cannot read a browser. `daily_brief_enabled`
-- is already a column for this precise reason (R2/#27) — these two join it.
--
-- ⚠️ NULLABLE, NO DEFAULT — the #599 precedent. A DEFAULT would stamp every historic row with
-- a preference nobody chose. NULL means "never chose", and the code reads NULL as "keep doing
-- what we do today", so applying this migration changes nobody's mail on its own.
--
-- ⚠️ `referral_handoff_at` IS A NEW COLUMN AND NOT A REUSE OF `referral_bonus_paid_at`, WHICH
-- IS THE WHOLE POINT. The automatic $45 wallet credit is retired (founder decision D2), but
-- the refund path still reads `referral_bonus_paid_at` to decide whether to claw $45 back out
-- of a wallet. Marking new, unpaid referrals with that column would make the first refund
-- reclaim money that was never granted. Historic paid referrals keep their marker and keep
-- reversing correctly; new ones are marked here instead.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS campaign_paused_emails_enabled boolean,
  ADD COLUMN IF NOT EXISTS weekly_digest_enabled          boolean,
  ADD COLUMN IF NOT EXISTS referral_handoff_at            timestamptz;
