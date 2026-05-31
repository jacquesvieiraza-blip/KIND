CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','signed')),
  recipient_email text,
  recipient_name text,
  sign_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_own_proposals" ON proposals FOR ALL USING (
  client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
);
