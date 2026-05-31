-- Client-assigned tasks to FIGSY. FIGSY observes, plans, executes, reports back.
CREATE TABLE IF NOT EXISTS figsy_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'escalated')),
  result text,
  assigned_by text NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE figsy_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients read own tasks"
  ON figsy_tasks FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

CREATE POLICY "clients insert own tasks"
  ON figsy_tasks FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

CREATE POLICY "service role full access"
  ON figsy_tasks FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE figsy_tasks IS 'Tasks assigned by clients to FIGSY. FIGSY observes, plans, executes, and reports back.';
