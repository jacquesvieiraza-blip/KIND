-- Platform status snapshots — written by cron 3× daily (07:05, 12:00, 19:00 SAST)
-- Admin portal reads latest row to show live status without asking Claude

CREATE TABLE IF NOT EXISTS platform_status (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  session      text NOT NULL CHECK (session IN ('morning', 'lunch', 'evening')),
  summary      text NOT NULL,         -- one-paragraph plain text summary
  data         jsonb NOT NULL,        -- structured status snapshot
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Only founder/service role can read/write
ALTER TABLE platform_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON platform_status
  USING (false)
  WITH CHECK (false);
