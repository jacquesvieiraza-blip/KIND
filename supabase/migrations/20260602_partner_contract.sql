-- Add contract sign-off tracking to partners
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_version    text DEFAULT 'v1.0';

COMMENT ON COLUMN partners.contract_signed_at IS 'Timestamp partner accepted the K.I.N.D Partner Agreement. NULL = not yet signed.';
