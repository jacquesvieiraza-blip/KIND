-- P0-14: Multi-model toggle — model_preference per campaign
-- 'haiku' = Claude Haiku (faster, higher volume, default)
-- 'sonnet' = Claude Sonnet (smarter, better for complex ICPs)

ALTER TABLE figsy_campaigns
  ADD COLUMN IF NOT EXISTS model_preference TEXT DEFAULT 'haiku'
    CHECK (model_preference IN ('haiku', 'sonnet'));
