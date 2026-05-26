-- ─────────────────────────────────────────────────────────────────────────────
-- 20260526_drip_and_controls.sql
-- Lead drip delivery, client lead quantity controls, subscription columns
-- Run once in Supabase SQL Editor — fully idempotent
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. leads — add delivered_at for drip gating
--    Existing leads get delivered_at = created_at (immediately visible, no disruption)
--    New leads inserted with delivered_at = NULL until daily cron delivers them
ALTER TABLE leads ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
UPDATE leads SET delivered_at = created_at WHERE delivered_at IS NULL;

-- 2. clients — lead quantity controls
ALTER TABLE clients ADD COLUMN IF NOT EXISTS leads_per_run   INTEGER DEFAULT 20;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS daily_drip_rate INTEGER DEFAULT 5;

-- 3. subscriptions — Paystack recurring subscription tracking
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 4. clients — track when last low-credit email was sent (prevent daily spam)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_low_credit_email_at TIMESTAMPTZ;
