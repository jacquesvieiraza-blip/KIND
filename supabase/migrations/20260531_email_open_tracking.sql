-- P0-4: Email Open Tracking
-- Add opened_at column to figsy_sent_emails for tracking pixel

ALTER TABLE figsy_sent_emails
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NULL;

-- Index for querying open rates per campaign
CREATE INDEX IF NOT EXISTS figsy_sent_emails_opened_at_idx
  ON figsy_sent_emails (campaign_id, opened_at)
  WHERE opened_at IS NOT NULL;
