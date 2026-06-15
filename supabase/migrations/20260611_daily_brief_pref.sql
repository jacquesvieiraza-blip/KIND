-- R2: Daily client briefing email (#27)
-- Persists the per-client "Daily brief" preference server-side so Milla's
-- morning-brief cron can honour it. Previously the toggle lived only in the
-- browser's localStorage and the cron ignored it entirely.
--
-- Default TRUE preserves today's behaviour (every active-Milla client is briefed);
-- clients opt OUT from Settings → Notification Preferences.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS daily_brief_enabled BOOLEAN DEFAULT TRUE;
