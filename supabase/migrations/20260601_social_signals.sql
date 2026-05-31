-- social_signals stored inside icps.settings jsonb
ALTER TABLE icps ADD COLUMN IF NOT EXISTS settings jsonb;
COMMENT ON COLUMN icps.settings IS 'jsonb: refinement_suggestions, social_signals {hashtags[], competitor_pages[], engagement_types[]}';
