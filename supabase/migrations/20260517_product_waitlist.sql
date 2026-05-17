-- Product waitlist for coming-soon products (Virtual Assistant, Chatbot Agent)
CREATE TABLE IF NOT EXISTS product_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  company text,
  product text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_waitlist" ON product_waitlist
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_read_waitlist" ON product_waitlist
  FOR SELECT TO service_role USING (true);
