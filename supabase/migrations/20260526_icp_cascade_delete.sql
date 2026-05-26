-- ICP cascade delete: when an ICP is deleted, set leads.icp_id to NULL
-- instead of blocking the delete or orphaning the lead.
-- Safe to run multiple times (idempotent).

-- Drop old FK constraint if it exists (may be RESTRICT or NO ACTION)
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_icp_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE leads
  ADD CONSTRAINT leads_icp_id_fkey
  FOREIGN KEY (icp_id)
  REFERENCES icps(id)
  ON DELETE SET NULL;
