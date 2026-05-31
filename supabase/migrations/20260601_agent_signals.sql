-- Unified signal layer: all three agents (FIGSY, Milla, Vida) write here.
-- Every other agent can read every signal, enabling cross-agent intelligence.
CREATE TABLE IF NOT EXISTS agent_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent text NOT NULL CHECK (agent IN ('figsy', 'milla', 'vida')),
  signal_type text NOT NULL,
  -- e.g. 'reply_received', 'meeting_booked', 'lead_scored', 'chat_session',
  --      'website_visit', 'sequence_paused', 'icp_refined', 'credit_low'
  payload jsonb NOT NULL DEFAULT '{}',
  -- arbitrary data: lead_id, score, sequence_id, reply_sentiment, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_signals_client ON agent_signals(client_id, created_at DESC);
CREATE INDEX idx_agent_signals_agent ON agent_signals(agent, signal_type);

-- RLS: clients read their own signals; service role writes
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients read own signals"
  ON agent_signals FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "service role full access"
  ON agent_signals FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE agent_signals IS 'Cross-agent signal bus: FIGSY, Milla, Vida write events here. All agents read all signals for the same client.';
