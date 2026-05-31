-- social_signals stored inside icps.settings jsonb, no schema change needed
-- but add a comment for documentation
COMMENT ON COLUMN icps.settings IS 'jsonb: refinement_suggestions, social_signals {hashtags[], competitor_pages[], engagement_types[]}';
