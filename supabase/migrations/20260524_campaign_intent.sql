-- Feature A: Campaign Intent Prompt
-- Adds campaign_intent and intent_mapped_at columns to figsy_campaigns

ALTER TABLE figsy_campaigns ADD COLUMN IF NOT EXISTS campaign_intent TEXT;
ALTER TABLE figsy_campaigns ADD COLUMN IF NOT EXISTS intent_mapped_at TIMESTAMPTZ;
