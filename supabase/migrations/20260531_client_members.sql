-- Multi-user team model
-- A client_id can have multiple members (owner + invited teammates)

CREATE TABLE IF NOT EXISTS client_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by    UUID REFERENCES auth.users(id),
  invited_at    TIMESTAMPTZ DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  invite_token  TEXT UNIQUE,
  UNIQUE(client_id, user_id),
  UNIQUE(client_id, email)
);

-- RLS
ALTER TABLE client_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members of their own client
CREATE POLICY "members_select" ON client_members
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_members WHERE user_id = auth.uid()
    )
    OR
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Only owner/admin can insert (invite)
CREATE POLICY "members_insert" ON client_members
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT cm.client_id FROM client_members cm WHERE cm.user_id = auth.uid() AND cm.role IN ('owner','admin')
    )
    OR
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Owner/admin can update (change roles), invitees can accept (update their own row)
CREATE POLICY "members_update" ON client_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR
    client_id IN (
      SELECT cm.client_id FROM client_members cm WHERE cm.user_id = auth.uid() AND cm.role IN ('owner','admin')
    )
    OR
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Only owner/admin can delete (remove members)
CREATE POLICY "members_delete" ON client_members
  FOR DELETE USING (
    client_id IN (
      SELECT cm.client_id FROM client_members cm WHERE cm.user_id = auth.uid() AND cm.role IN ('owner','admin')
    )
    OR
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Seed existing clients: make the existing user_id the owner
INSERT INTO client_members (client_id, user_id, email, role, accepted_at)
SELECT c.id, c.user_id, u.email, 'owner', NOW()
FROM clients c
JOIN auth.users u ON u.id = c.user_id
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS client_members_client_id_idx ON client_members(client_id);
CREATE INDEX IF NOT EXISTS client_members_user_id_idx ON client_members(user_id);
CREATE INDEX IF NOT EXISTS client_members_invite_token_idx ON client_members(invite_token) WHERE invite_token IS NOT NULL;
