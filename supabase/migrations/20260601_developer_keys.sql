CREATE TABLE IF NOT EXISTS developer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  name text NOT NULL DEFAULT 'My API Key',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  total_requests integer DEFAULT 0,
  revoked_at timestamptz
);
ALTER TABLE developer_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_own_keys" ON developer_keys FOR ALL USING (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
);
