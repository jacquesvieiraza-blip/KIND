CREATE TABLE IF NOT EXISTS visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text,
  company_name text,
  company_domain text,
  company_country text,
  company_size_range text,
  page_url text,
  referrer text,
  user_agent text,
  intent_score integer DEFAULT 0,
  visited_at timestamptz DEFAULT now()
);
-- Public insert (no auth needed for tracking)
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert_visits" ON visitor_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_visits" ON visitor_sessions FOR SELECT USING (true);
