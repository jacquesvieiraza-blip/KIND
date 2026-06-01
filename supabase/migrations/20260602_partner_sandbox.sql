-- Partner sandbox: demo_env_id now references clients.id (is_demo=true accounts)
-- No schema change needed — demo_env_id already exists as uuid with no FK constraint.
-- This migration documents the intent and adds a comment for clarity.

COMMENT ON COLUMN partners.demo_env_id IS
  'FK to clients.id where is_demo=true. Set automatically on partner approval. '
  'The referenced client account is the partner''s demo sandbox.';
