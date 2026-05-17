-- Contact requests (demo bookings, general enquiries)
CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text,
  type text DEFAULT 'demo', -- 'demo' | 'general' | 'enterprise'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_contact" ON contact_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_read_contact" ON contact_requests
  FOR SELECT TO service_role USING (true);

-- Partner applications
CREATE TABLE IF NOT EXISTS partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  website text,
  partner_type text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_partner" ON partner_applications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_read_partner" ON partner_applications
  FOR SELECT TO service_role USING (true);
