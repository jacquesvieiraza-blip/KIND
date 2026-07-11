-- 20260715_outreach_log.sql
-- Founder outreach scoreboard (cashflow §7B) — one row per week, so after a month
-- we can see which channel actually produces demos. Admin/founder-only surface.
--
-- Idempotent + additive: CREATE TABLE IF NOT EXISTS, safe to re-run. No RLS needed —
-- the table is only ever read/written through the admin-key-gated /outreach API
-- (service-role), never from the client portal.
--
-- One wide row per week (mirrors the scoreboard grid exactly): for each channel a
-- `sent` (touches you did) and `demos` (demos it produced), plus the week's `closes`.

CREATE TABLE IF NOT EXISTS public.outreach_log (
  week_start   date PRIMARY KEY,           -- the Monday of the week
  warm_sent    int NOT NULL DEFAULT 0,
  warm_demos   int NOT NULL DEFAULT 0,
  dm_sent      int NOT NULL DEFAULT 0,
  dm_demos     int NOT NULL DEFAULT 0,
  email_sent   int NOT NULL DEFAULT 0,
  email_demos  int NOT NULL DEFAULT 0,
  call_sent    int NOT NULL DEFAULT 0,
  call_demos   int NOT NULL DEFAULT 0,
  closes       int NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
